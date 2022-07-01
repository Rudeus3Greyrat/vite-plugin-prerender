export type VitePluginPrerender =  {
  /**
   * The path to the vite-outputted app to prerender
   */
  staticDir: string
  /**
   * The path your rendered app should be output to
   * @default staticDir
   */
  outputDir?: string
  /**
   * The location of index.html
   */
  indexPath?: string

  /**
   * Routes to render
   * @default: []
   */
  routes: Array<string>
  /**
   * Allows you to customize the HTML and output path before
   * writing the rendered contents to a file.
   * renderedRoute can be modified and it or an equivalent should be returned.
   * renderedRoute format:
   *    {
   *      route: String, // Where the output file will end up (relative to outputDir)
   *      originalRoute: String, // The route that was passed into the renderer, before redirects.
   *      html: String, // The rendered HTML for this route.
   *      outputPath: String // The path the rendered HTML will be written to.
   *    }
   */
  postProcess?: (renderedRoute:any)=>any

  /**
   * Allows you to customize the HTML and output path before
   * writing the rendered contents to a file.
   * renderedRoute can be modified and it or an equivalent should be returned.
   * renderedRoute format:
   *    {
   *      route: String, // Where the output file will end up (relative to outputDir)
   *      originalRoute: String, // The route that was passed into the renderer, before redirects.
   *      html: String, // The rendered HTML for this route.
   *      outputPath: String // The path the rendered HTML will be written to.
   *    }
   * DEPRECATED
   */
  postProcessHtml?: (renderedRoute:any)=>any

  /**
   *  Uses html-minifier (https://github.com/kangax/html-minifier)
   *  To minify the resulting HTML.
   *  Option reference: https://github.com/kangax/html-minifier#options-quick-reference
   */
  minify?: Record<string, any>

  /**
   * Server configuration options
   */
  server?: Record<string, any>
  /**
   * The actual renderer to use. (Feel free to write your own)
   * Available renderers: https://github.com/Tribex/prerenderer/tree/master/renderers
   */
  renderer?: any

  /**
   * Wait to render until the specified event is dispatched on the document.
   * eg, with `document.dispatchEvent(new Event('custom-render-trigger'))`
   * DEPRECATED
   */
  captureAfterDocumentEvent?: string

  /**
   * Wait to render until the specified element is detected using `document.querySelector`
   * DEPRECATED
   */
  captureAfterElementExists?: string

  /**
   * Wait to render until a certain amount of time has passed.
   * NOT RECOMMENDED
   * DEPRECATED
   */
  captureAfterTime?: number
}
