import type { CommandProps } from '@tiptap/core'
import { Node, mergeAttributes } from '@tiptap/core'
import type { SetImageOptions } from '@tiptap/extension-image'
import { Plugin } from '@tiptap/pm/state'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import TiptapExtensionImage from '../../../components/tiptap/extension/TiptapExtensionImage.vue'
import { sanitizeMediaUrl } from '../props'

export interface ImageOptions {
  inline: boolean
  allowBase64: boolean
  HTMLAttributes: Record<string, unknown>
}

export const Image = Node.create<ImageOptions>({
  name: 'image',

  addOptions() {
    return {
      inline: false,
      allowBase64: false,
      HTMLAttributes: {},
    }
  },

  inline() {
    return this.options.inline
  },

  group() {
    return this.options.inline ? 'inline' : 'block'
  },

  draggable: true,

  addAttributes() {
    return {
      props: {
        default: {},
        parseHTML: (element) => {
          return {
            src: element.getAttribute('src') || '',
            alt: element.getAttribute('alt') || '',
            title: element.getAttribute('title') || '',
            width: element.getAttribute('width') || '',
            height: element.getAttribute('height') || '',
            class: element.getAttribute('class') || '',
          }
        },
        renderHTML: (attributes) => {
          const props = attributes.props || {}
          const attrs: Record<string, string> = {}

          // Sanitize URL
          const sanitizedSrc = sanitizeMediaUrl(props.src, 'image')
          if (sanitizedSrc) attrs.src = sanitizedSrc

          // Other attributes
          if (props.alt) attrs.alt = String(props.alt)
          if (props.title) attrs.title = String(props.title)
          if (props.width) attrs.width = String(props.width)
          if (props.height) attrs.height = String(props.height)
          if (props.class) attrs.class = String(props.class)

          return attrs
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: this.options.allowBase64
          ? 'img[src]'
          : 'img[src]:not([src^="data:"])',
      },
    ]
  },

  renderHTML({ node }) {
    const props = node.attrs.props || {}
    const attrs: Record<string, string> = {}

    // Sanitize URL
    const sanitizedSrc = sanitizeMediaUrl(props.src, 'image')
    if (sanitizedSrc) attrs.src = sanitizedSrc

    // Other attributes
    if (props.alt) attrs.alt = String(props.alt)
    if (props.title) attrs.title = String(props.title)
    if (props.width) attrs.width = String(props.width)
    if (props.height) attrs.height = String(props.height)
    if (props.class) attrs.class = String(props.class)

    return ['img', mergeAttributes(this.options.HTMLAttributes, attrs)]
  },

  addNodeView() {
    const renderer = VueNodeViewRenderer(TiptapExtensionImage)
    return (props) => {
      const view = renderer(props)
      const { stopEvent } = view
      // The drag handle retargets on mousemove, which the node view swallows by default
      if (stopEvent) view.stopEvent = (event: Event) => event.type !== 'mousemove' && stopEvent.call(view, event)
      return view
    }
  },

  addProseMirrorPlugins() {
    const { name } = this
    return [
      new Plugin({
        view(editorView) {
          // A block image always resolves to the position before it, so nothing could be dropped
          // below an image that ends its slot. While dragging, its lower half targets the position after it.
          const posAtCoords = editorView.posAtCoords.bind(editorView)
          editorView.posAtCoords = (coords) => {
            const result = posAtCoords(coords)
            if (!editorView.dragging || !result || result.inside < 0) return result
            const node = editorView.state.doc.nodeAt(result.inside)
            if (!node || node.type.name !== name) return result
            const rect = (editorView.nodeDOM(result.inside) as HTMLElement).getBoundingClientRect()
            return coords.top > rect.top + rect.height / 2 ? { ...result, pos: result.inside + node.nodeSize } : result
          }
          return {}
        },
      }),
    ]
  },

  addCommands() {
    return {
      setImage: (options: SetImageOptions) => ({ commands }: CommandProps) => {
        return commands.insertContent({
          type: this.name,
          attrs: options,
        })
      },
    }
  },
})
