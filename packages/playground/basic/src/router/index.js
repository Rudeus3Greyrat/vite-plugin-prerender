import {createRouter,createWebHistory} from 'vue-router';
const routes=[
    {
        path: "",
        component: ()=>import('../App.vue'),
        meta: {
            title: "home"
        }
    },
    {
        path: "/about",
        component: ()=>import('../pages/about/about.vue'),
        meta: {
            title: "about"
        }
    },
    {
        path: "/info",
        redirect:'/info/overview',
        component: ()=>import('../pages/info/info.vue'),
        meta: {
            title: "info"
        },
        children:[
            {
                path: "/info/overview",
                component: ()=>import('../pages/info/overview/overview.vue'),
                meta: {
                    title: "overview"
                },
            },
            {
                path: "/info/stats",
                component: ()=>import('../pages/info/stats/stats.vue'),
                meta: {
                    title: "stats"
                },
            }
        ]
    },
]
const router = createRouter({
    // 4. 内部提供了 history 模式的实现。为了简单起见，我们在这里使用 hash 模式。
    history: createWebHistory(),
    routes, // `routes: routes` 的缩写
})

export default router
