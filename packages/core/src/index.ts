import type { Plugin, ResolvedConfig } from 'vite'
import path from 'path'
import Debug from 'debug'
import {VitePluginPrerender} from "./types";
import fs from "fs";
import chalk from 'chalk';

const Prerenderer = require('@prerenderer/prerenderer')
const PuppeteerRenderer = require('@prerenderer/renderer-puppeteer')
const { minify } = require('html-minifier')
const mkdirp = require('mkdirp')
const debug = Debug.debug('vite-plugin-prerender')

const compilerFS =fs

function vitePrerender(options: VitePluginPrerender): Plugin {
  // @ts-ignore
    let outputPath: string
  let config: ResolvedConfig

  const emptyPlugin: Plugin = {
    name: 'vite:prerender',
  }

  debug('plugin options:', options)

  const {_options} =initOptions(options)

  return {
    ...emptyPlugin,
    apply: 'build',
    enforce: 'post',
    configResolved(resolvedConfig) {
      config = resolvedConfig
      outputPath = path.isAbsolute(config.build.outDir)
        ? config.build.outDir
        : path.join(config.root, config.build.outDir)
      debug('resolvedConfig:', resolvedConfig)
    },
    async writeBundle(options,bundle){
      await emitRendered(_options)
    }
  }
}

const initOptions=(...args)=>{
  const rendererOptions:any = {} // Primarily for backwards-compatibility.

  let _options:any = {}

  // Normal args object.
  if (args.length === 1) {
    _options = args[0] || {}

    // Backwards-compatibility with v2
  } else {
    console.warn("[vite-plugin-prerender] You appear to be using the v2 argument-based configuration options. It's recommended that you migrate to the clearer object-based configuration system.\nCheck the documentation for more information.")
    let staticDir, routes

    args.forEach(arg => {
      if (typeof arg === 'string') staticDir = arg
      else if (Array.isArray(arg)) routes = arg
      else if (typeof arg === 'object') _options = arg
    })

    staticDir ? _options.staticDir = staticDir : null
    routes ? _options.routes = routes : null
  }

  // Backwards compatibility with v2.
  if (_options.captureAfterDocumentEvent) {
    console.warn('[vite-plugin-prerender] captureAfterDocumentEvent has been renamed to renderAfterDocumentEvent and should be moved to the renderer options.')
    rendererOptions.renderAfterDocumentEvent = _options.captureAfterDocumentEvent
  }

  if (_options.captureAfterElementExists) {
    console.warn('[vite-plugin-prerender] captureAfterElementExists has been renamed to renderAfterElementExists and should be moved to the renderer options.')
    rendererOptions.renderAfterElementExists = _options.captureAfterElementExists
  }

  if (_options.captureAfterTime) {
    console.warn('[vite-plugin-prerender] captureAfterTime has been renamed to renderAfterTime and should be moved to the renderer options.')
    rendererOptions.renderAfterTime = _options.captureAfterTime
  }

  _options.server = _options.server || {}
  _options.renderer = _options.renderer || new PuppeteerRenderer(Object.assign({}, { headless: true }, rendererOptions))

  if (_options.postProcessHtml) {
    console.warn('[vite-plugin-prerender] postProcessHtml should be migrated to postProcess! Consult the documentation for more information.')
  }

  return {rendererOptions,_options}
}

const emitRendered=(options)=>{
    const PrerendererInstance = new Prerenderer(options)

    PrerendererInstance.initialize()
        .then(() => {
            console.log(chalk.cyan(`[vite-plugin-prerender] Rendering routes [${chalk.green(`${options.routes.join(', ')}`)}] with puppeteer...`))
          return PrerendererInstance.renderRoutes(options.routes || [])
        })
        // Backwards-compatibility with v2 (postprocessHTML should be migrated to postProcess)
        .then(renderedRoutes => {
            console.log(chalk.green(`[vite-plugin-prerender] All routes rendered successfully!`))
            if(options.postProcessHtml){
                console.log(chalk.cyan(`[vite-plugin-prerender] Postprocessing rendered html files...`))
                return renderedRoutes.map(renderedRoute => {
                    const processed = options.postProcessHtml(renderedRoute)
                    if (typeof processed === 'string') renderedRoute.html = processed
                    else renderedRoute = processed

                    return renderedRoute
                })
            }else{
                return renderedRoutes
            }
            }
        )
        // Run postProcess hooks.
        .then(renderedRoutes => {
            if(options.postProcess){
                console.log(chalk.cyan(`[vite-plugin-prerender] Postprocessing rendered html files...`))
                return Promise.all(renderedRoutes.map(renderedRoute =>options.postProcess(renderedRoute)))
            }else{
                return renderedRoutes
            }
            }
        )
        // Check to ensure postProcess hooks returned the renderedRoute object properly.
        .then(renderedRoutes => {
          const isValid = renderedRoutes.every(r => typeof r === 'object')
          if (!isValid) {
            throw new Error('[vite-plugin-prerender] Rendered routes are empty, did you forget to return the `context` object in postProcess?')
          }

          return renderedRoutes
        })
        // Minify html files if specified in config.
        .then(renderedRoutes => {
          if (!options.minify) return renderedRoutes

            console.log(chalk.cyan(`[vite-plugin-prerender] minifying rendered html files...`))

          renderedRoutes.forEach(route => {
            route.html = minify(route.html, options.minify)
          })

          return renderedRoutes
        })
        // Calculate outputPath if it hasn't been set already.
        .then(renderedRoutes => {
          renderedRoutes.forEach(rendered => {
            if (!rendered.outputPath) {
              rendered.outputPath = path.join(options.outputDir || options.staticDir, rendered.route, 'index.html')
            }
          })

          return renderedRoutes
        })
        // Create dirs and write prerendered files.
        .then(processedRoutes => {
            console.log(chalk.cyan(`[vite-plugin-prerender] Generating rendered html files...`))
          const promises = Promise.all(processedRoutes.map(processedRoute => {
            return mkdirp(path.dirname(processedRoute.outputPath))
                .then(() => {
                  return new Promise((resolve, reject) => {
                    compilerFS.writeFile(processedRoute.outputPath, processedRoute.html.trim(), err => {
                      if (err) reject(`[vite-plugin-prerender] Unable to write rendered route to file "${processedRoute.outputPath}" \n ${err}.`)
                      else {
                        // @ts-ignore
                        resolve()
                      }
                    })
                  })
                })
                .catch(err => {
                  if (typeof err === 'string') {
                    err = `[vite-plugin-prerender] Unable to create directory ${path.dirname(processedRoute.outputPath)} for route ${processedRoute.route}. \n ${err}`
                  }

                  throw err
                })
          }))

          return promises
        })
        .then(r => {
          PrerendererInstance.destroy()
            console.log(chalk.green(`[vite-plugin-prerender] All done`))
        })
        .catch(err => {
          PrerendererInstance.destroy()
          const msg = '[vite-plugin-prerender] Unable to prerender all routes!'
          console.error(msg)
        })
}

vitePrerender.PuppeteerRenderer = PuppeteerRenderer

export default vitePrerender
