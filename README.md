# vite-plugin-prerender

[![npm][npm-img]][npm-url] [![downloads][downloads-img]][downloads-url] [![github][github-img]][github-url] [![license][license-img]][license-url]

_Flexible, framework-agnostic static site generation for sites and SPAs built with Vite._

It is inspired by [prerender-spa-plugin](https://github.com/chrisvfritz/prerender-spa-plugin)

> ✅ **Support any framework including Vue, React**
>
> ✅ **Flexible customised configuration**

## Install (yarn or npm)

**node version:** >=12.0.0

**vite version:** >=2.0.0

```
yarn add vite-plugin-prerender -D
```

or

```
npm i vite-plugin-prerender -D
```

## Basic Usage (`vite.config.js`)

```ts
import vitePrerender from 'vite-plugin-prerender'
import path from 'path'

export default () => {
  return {
    plugins: [
      vitePrerender({
        // Required - The path to the vite-outputted app to prerender.
        staticDir: path.join(__dirname, 'dist'),
        // Required - Routes to render.
        routes: ['/', '/about', '/some/deep/nested/route'],
      }),
    ],
  }
}
```

## Advanced Usage (`vite.config.js`)

```javascript
import vitePrerender from 'vite-plugin-prerender'
import path from 'path'

const Renderer = vitePrerender.PuppeteerRenderer

export default () => {
  return {
    plugins: [
      vitePrerender({
        // Required - The path to the vite-outputted app to prerender.
        staticDir: path.join(__dirname, 'dist'),

        // Optional - The path your rendered app should be output to.
        // (Defaults to staticDir.)
        outputDir: path.join(__dirname, 'prerendered'),

        // Optional - The location of index.html
        indexPath: path.join(__dirname, 'dist', 'index.html'),

        // Required - Routes to render.
        routes: ['/', '/about', '/some/deep/nested/route'],

        // Optional - Allows you to customize the HTML and output path before
        // writing the rendered contents to a file.
        // renderedRoute can be modified and it or an equivelant should be returned.
        // renderedRoute format:
        // {
        //   route: String, // Where the output file will end up (relative to outputDir)
        //   originalRoute: String, // The route that was passed into the renderer, before redirects.
        //   html: String, // The rendered HTML for this route.
        //   outputPath: String // The path the rendered HTML will be written to.
        // }
        postProcess(renderedRoute) {
          // Ignore any redirects.
          renderedRoute.route = renderedRoute.originalRoute
          // Basic whitespace removal. (Don't use this in production.)
          renderedRoute.html = renderedRoute.html.split(/>[\s]+</gim).join('><')
          // Remove /index.html from the output path if the dir name ends with a .html file extension.
          // For example: /dist/dir/special.html/index.html -> /dist/dir/special.html
          if (renderedRoute.route.endsWith('.html')) {
            renderedRoute.outputPath = path.join(
              __dirname,
              'dist',
              renderedRoute.route,
            )
          }

          return renderedRoute
        },

        // Optional - Uses html-minifier (https://github.com/kangax/html-minifier)
        // To minify the resulting HTML.
        // Option reference: https://github.com/kangax/html-minifier#options-quick-reference
        minify: {
          collapseBooleanAttributes: true,
          collapseWhitespace: true,
          decodeEntities: true,
          keepClosingSlash: true,
          sortAttributes: true,
        },

        // Server configuration options.
        server: {
          // Normally a free port is autodetected, but feel free to set this if needed.
          port: 8001,
        },

        // The actual renderer to use. (Feel free to write your own)
        // Available renderers: https://github.com/Tribex/prerenderer/tree/master/renderers
        renderer: new Renderer({
          // Optional - The name of the property to add to the window object with the contents of `inject`.
          injectProperty: '__PRERENDER_INJECTED',
          // Optional - Any values you'd like your app to have access to via `window.injectProperty`.
          inject: {
            foo: 'bar',
          },

          // Optional - defaults to 0, no limit.
          // Routes are rendered asynchronously.
          // Use this to limit the number of routes rendered in parallel.
          maxConcurrentRoutes: 4,

          // Optional - Wait to render until the specified event is dispatched on the document.
          // eg, with `document.dispatchEvent(new Event('custom-render-trigger'))`
          renderAfterDocumentEvent: 'custom-render-trigger',

          // Optional - Wait to render until the specified element is detected using `document.querySelector`
          renderAfterElementExists: 'my-app-element',

          // Optional - Wait to render until a certain amount of time has passed.
          // NOT RECOMMENDED
          renderAfterTime: 5000, // Wait 5 seconds.

          // Other puppeteer options.
          // (See here: https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#puppeteerlaunchoptions)
          headless: false, // Display the browser window when rendering. Useful for debugging.
        }),
      }),
    ],
  }
}
```

## Documentation

### Plugin Options

| Option      | Type                                          | Required? | Default                   | Description                                                                                                                                                                                         |
| ----------- | --------------------------------------------- | --------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| staticDir   | String                                        | Yes       | None                      | The root path to serve your app from.                                                                                                                                                               |
| outputDir   | String                                        | No        | None                      | Where the prerendered pages should be output. If not set, defaults to staticDir.                                                                                                                    |
| indexPath   | String                                        | No        | `staticDir/index.html`    | The index file to fall back on for SPAs.                                                                                                                                                            |
| postProcess | Function(Object context): [Object \| Promise] | No        | None                      | See the [Using the postProcess Option](#using-the-postprocess-option) section.                                                                                                                      |
| minify      | Object                                        | No        | None                      | Minifies the resulting HTML using [html-minifier](https://github.com/kangax/html-minifier). Full list of options available [here](https://github.com/kangax/html-minifier#options-quick-reference). |
| server      | Object                                        | No        | None                      | App server configuration options (See below)                                                                                                                                                        |
| renderer    | Renderer Instance or Configuration Object     | No        | `new PuppeteerRenderer()` | The renderer you'd like to use to prerender the app. It's recommended that you specify this, but if not it will default to `@prerenderer/renderer-puppeteer`.                                       |

#### Server Options

| Option | Type    | Required? | Default                    | Description                            |
| ------ | ------- | --------- | -------------------------- | -------------------------------------- |
| port   | Integer | No        | First free port after 8000 | The port for the app server to run on. |
| proxy  | Object  | No        | No proxying                | Proxy configuration.                   |

#### Using The postProcess Option

The `postProcess(Object context): Object | Promise` function in your renderer configuration allows you to adjust the output of `prerender-spa-plugin` before writing it to a file. It is called once per rendered route and is passed a `context` object in the form of:

```javascript
{
  // The prerendered route, after following redirects.
  route: String,
  // The original route passed, before redirects.
  originalRoute: String,
  // The resulting HTML for the route.
  html: String,
  // The path to write the rendered HTML to.
  // This is null (automatically calculated after postProcess)
  // unless explicitly set.
  outputPath: String || null
}
```

You can modify `context.html` to change what gets written to the prerendered files and/or modify `context.route` or `context.outputPath` to change the output location.

You are expected to adjust those properties as needed, then return the context object, or a promise that resolves to it like so:

```javascript
postProcess(context) {
  // Remove /index.html from the output path if the dir name ends with a .html file extension.
  // For example: /dist/dir/special.html/index.html -> /dist/dir/special.html
  if (context.route.endsWith('.html')) {
    context.outputPath = path.join(__dirname, 'dist', context.route)
  }

  return context
}

postProcess(context) {
  return someAsyncProcessing(context.html)
    .then((html) => {
      context.html = html;
      return context;
    });
}
```

---

### `@prerenderer/renderer-puppeteer` options

| Option                                                                                                                 | Type                                                                                                                                       | Required? | Default                | Description                                                                                                                                                                                                                                                            |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| maxConcurrentRoutes                                                                                                    | Number                                                                                                                                     | No        | 0 (No limit)           | The number of routes allowed to be rendered at the same time. Useful for breaking down massive batches of routes into smaller chunks.                                                                                                                                  |
| inject                                                                                                                 | Object                                                                                                                                     | No        | None                   | An object to inject into the global scope of the rendered page before it finishes loading. Must be `JSON.stringifiy`-able. The property injected to is `window['__PRERENDER_INJECTED']` by default.                                                                    |
| injectProperty                                                                                                         | String                                                                                                                                     | No        | `__PRERENDER_INJECTED` | The property to mount `inject` to during rendering.                                                                                                                                                                                                                    |
| renderAfterDocumentEvent                                                                                               | String                                                                                                                                     | No        | None                   | Wait to render until the specified event is fired on the document. (You can fire an event like so: `document.dispatchEvent(new Event('custom-render-trigger'))`                                                                                                        |
| renderAfterElementExists                                                                                               | String (Selector)                                                                                                                          | No        | None                   | Wait to render until the specified element is detected using `document.querySelector`                                                                                                                                                                                  |
| renderAfterTime                                                                                                        | Integer (Milliseconds)                                                                                                                     | No        | None                   | Wait to render until a certain amount of time has passed.                                                                                                                                                                                                              |
| skipThirdPartyRequests                                                                                                 | Boolean                                                                                                                                    | No        | `false`                | Automatically block any third-party requests. (This can make your pages load faster by not loading non-essential scripts, styles, or fonts.)                                                                                                                           |
| consoleHandler                                                                                                         | function(route: String, message: [ConsoleMessage](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#class-consolemessage)) | No        | None                   | Allows you to provide a custom console.\* handler for pages. Argument one to your function is the route being rendered, argument two is the [Puppeteer ConsoleMessage](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#class-consolemessage) object. |
| [[Puppeteer Launch Options]](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#puppeteerlaunchoptions) | ?                                                                                                                                          | No        | None                   | Any additional options will be passed to `puppeteer.launch()`, such as `headless: false`.                                                                                                                                                                              |

---

### `@prerenderer/renderer-jsdom` options

| Option                   | Type                   | Required? | Default                | Description                                                                                                                                                                                         |
| ------------------------ | ---------------------- | --------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| maxConcurrentRoutes      | Number                 | No        | 0 (No limit)           | The number of routes allowed to be rendered at the same time. Useful for breaking down massive batches of routes into smaller chunks.                                                               |
| inject                   | Object                 | No        | None                   | An object to inject into the global scope of the rendered page before it finishes loading. Must be `JSON.stringifiy`-able. The property injected to is `window['__PRERENDER_INJECTED']` by default. |
| injectProperty           | String                 | No        | `__PRERENDER_INJECTED` | The property to mount `inject` to during rendering.                                                                                                                                                 |
| renderAfterDocumentEvent | String                 | No        | None                   | Wait to render until the specified event is fired on the document. (You can fire an event like so: `document.dispatchEvent(new Event('custom-render-trigger'))`                                     |
| renderAfterElementExists | String (Selector)      | No        | None                   | Wait to render until the specified element is detected using `document.querySelector`                                                                                                               |
| renderAfterTime          | Integer (Milliseconds) | No        | None                   | Wait to render until a certain amount of time has passed.                                                                                                                                           |

---

## License

MIT

[npm-img]: https://img.shields.io/npm/v/vite-plugin-prerender.svg
[npm-url]: https://www.npmjs.com/package/vite-plugin-prerender
[downloads-img]: https://img.shields.io/npm/dw/vite-plugin-prerender
[downloads-url]: https://www.npmjs.com/package/vite-plugin-prerender
[github-img]: https://img.shields.io/github/stars/Rudeus3Greyrat/vite-plugin-prerender
[github-url]: https://github.com/Rudeus3Greyrat/vite-plugin-prerender
[license-img]: https://img.shields.io/npm/l/vite-plugin-prerender
[license-url]: https://github.com/Rudeus3Greyrat/vite-plugin-prerender
