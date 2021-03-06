/**
 * jQloader  v0.2.4
 * @license  MIT
 * Designed  and built by Moer
 * Homepage  https://moerj.github.io/jQloader
 * GitHub    https://github.com/Moerj/jQloader
 */

if (typeof jQuery === 'undefined' && typeof Zepto === 'undefined') {
    throw new Error('jQloader\'s JavaScript requires jQuery or Zepto')
}

{

    const $window = $(window);
    const $html = $('html');
    const $body = $('body');
    let $router;
    let _jQloader_isReady = false; //当前组件初始化状态

    const OPTS_DEFAULT = {
        history: true,
        progress: true,
        loading: false,
        cache: true,
        async: true,
        title: null,
        // strict: true, 开启严格模式，
        // 加载的 ajax 页面有 script 脚本时会强制重载当前页，
        // 用于清空页面所有ajax 残留 js，防止 js 重复绑定等问题
        strict: false
    }


    // jQloader的存储机制 
    const JQloader = (dom) => {
        if (dom._jQloader === undefined) {
            dom._jQloader = {}
        }
        return {
            get: (key) => {
                return dom._jQloader[key]
            },
            set: (key, val) => {
                dom._jQloader[key] = val
            },
            push: (key, val) => {
                if (dom._jQloader[key] === undefined) {
                    dom._jQloader[key] = []
                }
                dom._jQloader[key].push(val)
            }
        }
    }

    // 进度条
    class ProgressBar {
        constructor() {
            this.color = '#58a2d1';
            this.transition = '10s width';
            this.timer = null;
            this.$progress = $('<span class="jQloader-ProgressBar"></span>');
            this.reset();
            $html.append(this.$progress);
        }
        reset() {
            this.$progress.css({
                backgroundColor: this.color,
                transition: 'none',
                height: '2px',
                width: 0,
                position: 'fixed',
                left: 0,
                top: 0,
                zIndex: 9999,
                boxShadow: '1px 1px 2px 0 ' + this.color
            });
        }
        max() {
            return document.body.clientWidth
        }
        setColor(color) {
            if (typeof color === 'string') {
                this.color = color;
            }
        }
        start() {
            this.reset();
            this.$progress.css({
                width: this.max(),
                transition: this.transition
            });
        }
        stop() {
            this.$progress.css({
                width: this.$progress.width()
            });
        }
        finish() {
            this.stop();
            this.$progress.css({
                width: this.max(),
                transition: '0.5s width'
            });
            if (!this.timer) {
                this.timer = setTimeout(() => {
                    this.timer = null;
                    this.reset();
                }, 700)
            }
        }
    }

    // 容器加载 loading 效果
    class Loading {
        constructor() {
            this.$element = $('<div class="jQloader-loading">\
                                    <div class="loadingBox">\
                                        <span class="loadingEffect fa fa-spin fa-spinner"></span>\
                                        <span class="loadingText"> loading...</span>\
                                    </div>\
                                </div>');
            this.$loadingEffect = this.$element.find('.loadingEffect');
            this.$loadingText = this.$element.find('.loadingText');
            this.$loadingBox = this.$element.find('.loadingBox');

            this.$element.css({
                width: $window.width(),
                height: $window.height(),
                position: 'absolute',
                zIndex: 9999,
                top: 0,
                left: 0,
                display: 'none'
            })
            this.$loadingBox.css({
                position: 'absolute',
                padding: '5px 15px',
                top: '50%',
                left: '50%',
                transform: 'translate3d(-50%,-50%,0)',
                background: 'rgba(0, 0, 0, 0.3)',
                textAlign: 'center',
                lineHeight: '80px',
                color: '#fff',
                fontSize: '16px'
            })

            $html.append(this.$element);
        }
        _reSize() {
            this.$element.css({
                width: $window.width(),
                height: $window.height()
            });
        }
        show() {
            this._reSize();
            this.$element.show();
        }
        hide() {
            this.$element.hide();
        }
    }



    // 编译当前页面 html 标签上的 loadPage 指令
    function _compile() {

        // 检测路由容器
        if (!$router || !$router.length) {
            $router = $('jq-router').eq(0);
        }

        // 编译include
        const _compile_jqInclude = (dom) => {
            let $dom = $(dom);
            let url = $dom.attr('src');
            if (url) {
                let $container = $('<div></div>');
                $dom.replaceWith($container);
                $container.loadPage({
                    url: url,
                    history: false,
                    progress: false
                }, () => {
                    // 编译并ajax加载完成后的回调
                    $container.children().eq(0).unwrap();
                })
            }
        }
        let includeDoms = document.getElementsByTagName('jq-include');
        for (let i = 0; i < includeDoms.length; i++) {
            _compile_jqInclude(includeDoms[i])
        }

    }


    // 拦截并重写 a 标签事件
    function _reWriteLinks() {

        // 判断标签上的属性是否合法，允许默认布尔值，无参数时为 true
        //  例如：<a strict></a> === <a strict="true"></a>
        const isAttr = (attributeObj) => {
            let value = attributeObj.value;
            if (value === "false") {
                return false;
            } else if (value === "true" || value === '') {
                return true;
            } else {
                return value
            }
        }

        $body.on('click', 'a', (e) => {
            let a = e.currentTarget;

            // load 类型
            let loadUrl = a.getAttribute('load');
            if (loadUrl) {
                e.preventDefault();

                let container = a.getAttribute('to');
                let $container;

                if (container) {
                    $container = $(container)
                } else {
                    $container = $router
                }

                let opts = {};
                let attrs = a.attributes;

                // 将所有属性遍历，并拼装成对象
                for (let i = 0; i < attrs.length; i++) {
                    let attr = attrs[i];
                    let res = isAttr(attr);
                    if (res !== undefined) {
                        opts[attr.nodeName] = res;
                    }
                }

                // 需要请求的 url 就是 load 属性的值
                opts.url = opts.load;

                opts = $.extend({}, OPTS_DEFAULT, opts);


                $container.loadPage(opts);

                return;
            }

            // 锚点类型
            let hash = a.hash;
            if (hash) {
                e.preventDefault();
                let id = hash.substr(1);
                // 用原生 js 获取 dom，因为jQuery $('')选择器获取中文的id会忽略空格。
                let $anchor = $(document.getElementById(id));
                let $win = $html.add($body);
                // 滚动到锚点元素
                if ($.fn.animate) {
                    $win.animate({
                        scrollTop: $anchor.offset().top + 'px'
                    }, 300);
                } else {
                    $win.scrollTop($anchor.offset().top);
                }

                return;
            }

        })

    }

    // 载入历史记录
    function _loadHitory() {
        let historyData = history.state;
        let locationHash = document.location.hash.substr(1);

        if (historyData) {
            let url = historyData.url
            let $container;

            // 指定读取历史页面的容器
            if (historyData.id) {
                $container = $('#' + historyData.id)
            } else {
                $container = $router
            }

            if (!$container || !$container.length) {
                return;
            }

            $container.loadPage({
                url: url,
                history: false,
                progress: true,
                title: historyData.title
            });

            return;
        }

        if (locationHash && $router.length) {

            $router.loadPage({
                url: locationHash,
                history: false,
                progress: true
            });

            return;
        }

        // 没有 url 参数，代表当前回到无路由页面
        // 强制刷新一次，释放内存，也让它真正回到首页
        if (_jQloader_isReady) {
            window.location.replace(window.location.href);
        }
    }

    // popstate 地址栏改变事件，浏览器前进、后退、手动修改地址栏
    // 注意 history.pushState 不会触发该事件
    window.addEventListener("popstate", () => {
        if (_jQloader_isReady) {
            _loadHitory()
        }
    });


    // 暴露的公共方法 ==============================

    // loadPage 加载完后的回调组，用于指令触发load后的回调
    $.fn.loadFinish = function(call_back) {
        let container = $(this);
        JQloader(container[0]).push('loadPageCallBacks', call_back)
        return container
    }

    // 加载一个页面
    $.fn.loadPage = function(OPTS, call_back) {
        let $container = $(this);

        if (!$container.length) {
            throw new Error('\'' + this.prevObject.selector + '\' not a vaild selector');
        }

        OPTS = $.extend({}, OPTS_DEFAULT, OPTS);

        // ajax 请求完成后的一些列链式流程
        const _todo = (OPTS, data) => {
            let _this = {
                strict: () => {
                    // 严格模式强制重载有 js 的 ajax 页面
                    if (OPTS.strict && data.indexOf('<script') >= 0) {
                        let host = window.location.host;
                        window.location.reload(host + '/#' + OPTS.url);
                    }
                    return _this;
                },
                history: () => {
                    // 记录浏览器历史
                    if (OPTS.history) {
                        // 处理 url 格式，浏览器地址栏去掉./开头
                        let url = OPTS.url;
                        if (OPTS.url.substring(0, 2) === './') {
                            url = OPTS.url.substring(2)
                        }

                        // 浏览器地址栏操作
                        // 路由 url 以#号开头，拼接在当前 url 后面
                        if ($container[0].localName === 'jq-router') {
                            // 一级路由 url
                            history.pushState({
                                title: OPTS.title,
                                url: OPTS.url
                            }, '', '#' + url);
                        } else {
                            // 二级路由 url
                            // 加载容器非路由，需记录 id   请求的 url 拼接在当前路由地址后面
                            let hashList = window.location.hash.split("#");
                            let routerUrl = hashList[1];
                            history.pushState({
                                title: OPTS.title,
                                id: $container.attr('id'),
                                url: OPTS.url
                            }, '', '#' + routerUrl + '#' + OPTS.url);
                        }
                    }
                    return _this;
                },
                title: () => {
                    // 修改页面 title
                    if (OPTS.title) {
                        window.document.title = OPTS.title;
                    }
                    return _this;
                },
                render: () => {
                    // 写入页面
                    $container.html(data);
                    return _this;
                },
                zepto: () => {
                    // 解决Zepto ajxa 请求到的页面 script 标签执行问题
                    if (typeof Zepto != 'undefined' && typeof jQuery == 'undefined') {
                        let script = $container.find('script');
                        for (let i = 0; i < script.length; i++) {
                            let src = script[i].src;
                            if (src) {
                                // Zepto不会运行外联script
                                $.get(src)
                            } else {
                                // Zepto会执行两次页面的内联script
                                $(script[i]).remove()
                            }
                        }
                    }
                    return _this;
                },
                compile: () => {
                    // 编译新页面上的指令
                    _compile();
                    return _this;
                },
                callbacks: () => {
                    // 运行容器上的回调方法组
                    let callBacks = JQloader($container[0]).get('loadPageCallBacks');
                    if (callBacks) {
                        for (var i = 0; i < callBacks.length; i++) {
                            callBacks[i]();
                        }
                    }
                    return _this;
                }

            }
            return _this;
        }

        // 开启 loading 进度条
        if (OPTS.progress && !OPTS.strict) {
            $.progressBar.start();
        }

        // 开启 loading 锁定
        if (OPTS.loading) {
            $.loadingMask.show();
        }


        // 请求页面
        $.ajax({
            dataType: 'html',
            url: OPTS.url,
            cache: OPTS.cache,
            async: OPTS.async,
            timeout: 10000,
            success: (data) => {

                _todo(OPTS, data)
                    .strict()
                    .history()
                    .title()
                    .render()
                    .zepto()
                    .compile()
                    .callbacks();

            },
            error: () => {
                console.warn('页面载入失败！');
            },
            complete: () => {
                // 进度条结束
                if (OPTS.progress && !OPTS.strict) {
                    $.progressBar.finish();
                }

                // 关闭锁定
                if (OPTS.loading) {
                    $.loadingMask.hide();
                }

                // 本次 ajax 的回调
                if (call_back) call_back();
            }
        })

        return $container;
    }


    // 创建并暴露 进度条
    $.progressBar = new ProgressBar();

    // 创建并暴露 loading蒙层
    $.loadingMask = new Loading();

    $(() => { // jQloader所在页面/首页初始化 dom 完毕


        // 重写 a 标签事件
        _reWriteLinks();

        // 执行一次编译
        _compile();

        // 请求一次浏览器历史
        _loadHitory();

        // 组件加载完成
        _jQloader_isReady = true;

    })

}