import vue from '@vitejs/plugin-vue'
import jsx from '@vitejs/plugin-vue-jsx'
import vitePrerender from 'vite-plugin-prerender'
import path from 'path'

const Renderer = vitePrerender.PuppeteerRenderer;

export default () => {
  return {
    build: {
      assetsInlineLimit: 0,
    },
    plugins: [
      vue(),
      jsx(),
      vitePrerender({
        staticDir: path.join(__dirname, "dist/"),
        routes: ["/","/about","/info/overview","/info/stats"],
        renderer: new Renderer({
          headless: true,
          // renderer: new vitePrerender.PuppeteerRenderer({
          //   renderAfterTime: 5000
          // }),
          renderAfterElementExists: '#app',
          args: ["--no-sandbox"],
          maxConcurrentRoutes: 10
        })
      }),
    ],
  }
}
