import BrowserUiState from 'browser-ui-state'
import DebugWidget from './debug/debug-widget'
import DebugWidgetTrigger from './debug/debug-widget-trigger'
import EventThrottle from '../utils/event-throttle'
import $ from '../utils/dom'

//Private scope
const localStorageDisableKey = 'SwipeUp._disabled'
const expandBodyHeightTo = '110vh'

//win is a shortcut for window
let _win = new WeakMap(), _options = new WeakMap(), _swipeUpOverlay = new WeakMap(), _debugWidget = new WeakMap()

//TODO add styles overrides, + add switch to override or init styles
const defaultOptions = {
    initialOrientation: null,
    addImportantToBodyHeight: false, //Some Web apps use importants like: body {height:100% !important}, so this to allow them to override this to add important rule as well
    fixateRootElementsOnInit: false,
    scrollWindowToTopOnShow: false,//TODO this param may be incompatible if to add scroll and touchmove handlers
    useHtml5FullScreenWhenPossible: true, //fixateRootElementsOnInit has no sense for user-agents capable of HTML5 Fullscreen API
    excludedUserAgents: null,
    useTextInsteadOfImages: false,
    swipeUpText: 'Swipe up to continue in full-screen mode',
    html5FullScreenText: 'Touch to continue in full-screen mode',
}

let showOrHide = (self) => {
    let disabledInDebugging = (_win.get(self).localStorage.getItem(localStorageDisableKey) === 'true')
    let win = _win.get(self), options = _options.get(self), swipeUpOverlay = _swipeUpOverlay.get(self)

    if (!disabledInDebugging && self.isEnabled && self.browserUiState.state === 'COLLAPSED') {
        $(swipeUpOverlay).show()
        options.scrollWindowToTopOnShow ? win.scrollTo(0, 0) : null
    } else if (swipeUpOverlay.style.display !== 'none') {
        $(swipeUpOverlay).hide()
    }
}

//TODO findout when and why CP got position:absolute override for #app
let fixateRootElementsIfNeeded = (self) => {
    if (_options.get(self).fixateRootElementsOnInit) {
        Array.from(_win.get(self).document.body.children).forEach((el) => el.style.position = 'fixed')
    }
}

//TODO fix Safari portrait not swiping on CP loading screen
//TODO fix Safari sometimes not showing swipe up even though debug widget get resize event
export default class SwipeUp {
    constructor(opts, windowObj = window) {
        if (!windowObj.document.body) {
            throw new Error('Swipe Up should be instantiated on window load when DOM is ready')
        }
        _win.set(this, windowObj)
        _options.set(this, Object.assign(defaultOptions, opts))
        let win = _win.get(this)
        let options = _options.get(this)

        //expose browser-ui-state and fscreen as part of swipe-up API
        this.browserUiState = new BrowserUiState(options.initialOrientation, win)
        this.fscreen = this.browserUiState.fscreen


        //Proceed to init DOM if not forbidden by excludedUserAgents option
        if (!this.isUserAgentExcluded) {
            let useHtml5FullScreen = options.useHtml5FullScreenWhenPossible && this.fscreen.fullscreenEnabled
            if (!useHtml5FullScreen) {
                fixateRootElementsIfNeeded(this)

                //Required for Safari portrait
                options.addImportantToBodyHeight ?
                win.document.body.style.setProperty('height', expandBodyHeightTo, 'important') :
                win.document.body.style.setProperty('height', expandBodyHeightTo)
            }

            let useTextInsteadOfImages = options.useTextInsteadOfImages
            let html5FullScreenText = options.html5FullScreenText
            let swipeUpText = options.swipeUpText
            _swipeUpOverlay.set(this, win.document.createElement('div'))
            let swipeUpOverlay = _swipeUpOverlay.get(this)
            swipeUpOverlay.className = 'swipeUpOverlay'
            swipeUpOverlay.innerHTML =
                `<div class='fixedFlexBox'>` +
                    `<div class='content'>` +
                        (useHtml5FullScreen ?
                            (useTextInsteadOfImages ?
                                html5FullScreenText
                                    :
                                `<svg id='touch-hand' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 550 400'>` +
                                    `<title>swipe-up-hand_remastered</title>` +
                                    `<path class='touch__pseudoCircle'` +
                                          `d='M109.91,127.53a21.94,21.94,0,0,1,2.61-17.11c10.37-16.64,37.79-11,53-2C170,111,176.65,114.74,184.4,119l7.32,4a55,55,0,1,0-29.56,50.58c-8.35-5-16.56-9.92-24.25-14.48C123,150.31,112.53,138.48,109.91,127.53Z'` +
                                          `fill='#f6ae38'/>` +
                                    `<path class='touch__hand'` +
                                          `d='M441.77,147.69c-21.49-31.12-35-44.5-53.73-53-25-11.41-43.29-2-49.65,2.28-7.23-2.26-27.4-7.4-42.23.69a29.23,29.23,0,0,0-13.69,16.26c-13.29-3.32-32.17-.41-42.85,10.24-6.51,6.51-10,13.4-10.37,20.59-11.57-7.19-25.17-14.83-37.48-21.68l-7.32-4c-7.75-4.28-14.44-8-18.88-10.6-15.21-9-42.63-14.64-53,2A21.94,21.94,0,0,0,110,127.58c2.62,10.95,13.1,22.78,28,31.63,7.69,4.56,15.89,9.47,24.25,14.48,11.8,7.08,23.9,14.39,35.3,21.27,28.59,17.22,51.26,30.9,56.1,33.31,8.41,4.19,23.52,17.59,21.88,23.85-1.54,5.87-13.52,7.88-35.6,6A77.23,77.23,0,0,0,189.83,271c-8.73,5.66-18.82,18-20.3,29.82-.74,6,.78,11.13,4.41,15,10,10.65,24,12.7,53.65,7.83,17-2.8,48.79-8,72.93-2.06l1.5.37c19.66,4.85,46.57,11.49,75.46,6.21,17.73-3.24,31.7-8.35,42.87-14.8,25.69-14.83,36.5-36.71,43.75-59.05C475.61,219.69,461.18,175.86,441.77,147.69Zm12.94,103.68c-9.22,28.33-22.88,56.84-78.88,67.07-26.77,4.92-52.48-1.45-71.25-6.08l-1.5-.37c-26.18-6.43-59.24-1-77,1.91-29.16,4.79-38.5,1.85-44.77-4.84-1.59-1.73-2.19-4-1.81-7,1-8.35,9-18.27,15.8-22.66,1.2-.8,2.54-1.64,4-2.48a65.72,65.72,0,0,1,39.63-8.84c20.63,1.76,42.25,1.57,46.18-13.43,4.14-15.68-22-32.74-27-35.22-4.53-2.28-28.13-16.52-55.46-33-10.1-6.1-20.76-12.53-31.26-18.84-9.78-5.87-19.42-11.64-28.36-16.94-12.46-7.45-21.46-17.16-23.46-25.45a11.88,11.88,0,0,1,1.44-9.51c6.22-9.94,27.15-5.93,39.43,1.33,4.5,2.66,11.33,6.4,19.13,10.74L191,134.09c14.72,8.2,30.65,17.29,42.34,25.21l9.83,5-4-12c-.93-6.44-1.75-11.66,7.62-21,9.53-9.54,28.61-10.12,37.06-6.32l5.66,2.54,1.3-6.07c1.53-7.13,4.85-12,10.18-14.92,13.88-7.59,36.32.7,36.55.78l2.78,1,2.26-1.91c.67-.54,16.68-13.77,41.36-2.54,17,7.75,29.11,19.81,49.69,49.62,17.44,25.26,31.48,66.68,21.09,97.93Z'` +
                                          `fill='#ffffff'/>` +
                                `</svg>`)
                            :
                            (useTextInsteadOfImages ?
                                swipeUpText
                                    :
                                `<svg id="swipe-up-hand" data-name="swipe-up-hand" xmlns="http://www.w3.org/2000/svg"` +
                                     `viewBox="0 0 386.45 500.21">` +
                                    `<defs>` +
                                        `<linearGradient id="trailGradient" x1="0%" y1="100%" x2="0%" y2="0%">` +
                                            `<stop offset="0%" stop-color="rgba(246, 174, 56, 0.1) "/>` +
                                            `<stop offset="100%" stop-color="rgba(246, 174, 56, 0.7) "/>` +
                                        `</linearGradient>` +
                                    `</defs>` +
                                    `<title>swipe-up-hand</title>` +
                                    `<path class="swipe__trail"` +
                                          `d="M16.15,93.89C25.34,200.62,55,500.17,55,500.17S81.75,229.32,92.28,111l-11.84-7.12-.11-.06a55,55,0,0,1-64.18-9.87Z"` +
                                          `fill="url(#trailGradient)"/>` +
                                    `<path class="swipe__pseudoCircle"` +
                                          `d="M28.14,57.67a21.94,21.94,0,0,1,2.61-17.11c10.37-16.64,37.79-11,53-2,4.44,2.63,11.13,6.32,18.88,10.6l7.32,4a55,55,0,1,0-29.56,50.58c-8.35-5-16.56-9.92-24.25-14.48C41.24,80.45,30.76,68.62,28.14,57.67Z"` +
                                          `fill="#f6ae38"/>` +
                                    `<path class="swipe__hand"` +
                                          `d="M360,77.83c-21.49-31.12-35-44.5-53.73-53-25-11.41-43.29-2-49.65,2.28-7.23-2.26-27.4-7.4-42.23.69A29.23,29.23,0,0,0,200.7,44.06c-13.29-3.32-32.17-.41-42.85,10.24-6.51,6.51-10,13.4-10.37,20.59C135.91,67.7,122.31,60.06,110,53.21l-7.32-4c-7.75-4.28-14.44-8-18.88-10.6-15.21-9-42.63-14.64-53,2a21.94,21.94,0,0,0-2.61,17.11c2.62,10.95,13.1,22.78,28,31.63,7.69,4.56,15.89,9.47,24.25,14.48,11.8,7.08,23.9,14.39,35.3,21.27,28.59,17.22,51.26,30.9,56.1,33.31,8.41,4.19,23.52,17.59,21.88,23.85-1.54,5.87-13.52,7.88-35.6,6a77.23,77.23,0,0,0-50.06,12.91c-8.73,5.66-18.82,18-20.3,29.82-.74,6,.78,11.13,4.41,15,10,10.65,24,12.7,53.65,7.83,17-2.8,48.79-8,72.93-2.06l1.5.37c19.66,4.85,46.57,11.49,75.46,6.21,17.73-3.24,31.7-8.35,42.87-14.8,25.69-14.83,36.5-36.71,43.75-59.05C393.84,149.83,379.41,106,360,77.83Zm12.94,103.68c-9.22,28.33-22.88,56.84-78.88,67.07-26.77,4.92-52.48-1.45-71.25-6.08l-1.5-.37c-26.18-6.43-59.24-1-77,1.91-29.16,4.79-38.5,1.85-44.77-4.84-1.59-1.73-2.19-4-1.81-7,1-8.35,9-18.27,15.8-22.66,1.2-.8,2.54-1.64,4-2.48a65.72,65.72,0,0,1,39.63-8.84c20.63,1.76,42.25,1.57,46.18-13.43,4.14-15.68-22-32.74-27-35.22-4.53-2.28-28.13-16.52-55.46-33-10.1-6.1-20.76-12.53-31.26-18.84C79.84,91.86,70.2,86.09,61.26,80.79,48.8,73.34,39.8,63.63,37.8,55.34a11.88,11.88,0,0,1,1.44-9.51c6.22-9.94,27.15-5.93,39.43,1.33C83.17,49.82,90,53.56,97.8,57.9l11.41,6.33c14.72,8.2,30.65,17.29,42.34,25.21l9.83,5-4-12c-.93-6.44-1.75-11.66,7.62-21,9.53-9.54,28.61-10.12,37.06-6.32l5.66,2.54,1.3-6.07c1.53-7.13,4.85-12,10.18-14.92,13.88-7.59,36.32.7,36.55.78l2.78,1,2.26-1.91c.67-.54,16.68-13.77,41.36-2.54,17,7.75,29.11,19.81,49.69,49.62,17.44,25.26,31.48,66.68,21.09,97.93Z"` +
                                          `fill="#ffffff"/>` +
                                `</svg>`) ) +
                    `</div>` +
                `</div>`
            win.document.body.appendChild(swipeUpOverlay)

            if (useHtml5FullScreen) {
                $('.fixedFlexBox').get().addEventListener('click',
                    () => this.fscreen.requestFullscreen(win.document.documentElement))
            }

            let debugWidgetTrigger = new DebugWidgetTrigger(this, swipeUpOverlay, win)
            debugWidgetTrigger.shouldShowWidgetOnLoad ? this.showDebugWidget() : null

            const resizeHandler = (event) => {
                showOrHide(this)
                _debugWidget.get(this) ? _debugWidget.get(this).update() : null
            }

            new EventThrottle('resize', 'optimizedResize', win)
            new EventThrottle('orientationchange', 'optimizedOrientationchange', win)
            //new EventThrottle('scroll', 'optimizedScroll', win)
            //new EventThrottle('touchmove', 'optimizedTouchmove', win)
            win.addEventListener('optimizedResize', resizeHandler)
            win.addEventListener('optimizedOrientationchange', resizeHandler)
            //win.addEventListener('optimizedScroll', resizeHandler)
            //win.addEventListener('optimizedTouchmove', resizeHandler)
        }
    }

    get isShown() {
        return _swipeUpOverlay.get(this).style.display === 'block'
    }

    get isUserAgentExcluded() {
        return _options.get(this).excludedUserAgents &&
               _options.get(this).excludedUserAgents instanceof RegExp &&
               _options.get(this).excludedUserAgents.test(_win.get(this).navigator.userAgent)
    }

    disable() {
        this.isEnabled = false
        $(_swipeUpOverlay.get(this)).hide()
    }

    enable() {
        this.isEnabled = true
        _win.get(this).localStorage.setItem(localStorageDisableKey, 'false')
        !this.isUserAgentExcluded ? showOrHide(this) : null
    }

    showDebugWidget() {
        if (!_debugWidget.get(this)) {
            _debugWidget.set(this, new DebugWidget(this, _swipeUpOverlay.get(this)))
        }
        _debugWidget.get(this).show()
    }

    hideDebugWidget() {
        if (!_debugWidget.get(this)) {
            _debugWidget.set(this, new DebugWidget(this, _swipeUpOverlay.get(this)))
        }
        _debugWidget.get(this).hide()
    }

    toggleDebugWidget() {
        if (!_debugWidget.get(this)) {
            _debugWidget.set(this, new DebugWidget(this, _swipeUpOverlay.get(this)))
        }
        _debugWidget.get(this).toggle()
    }
}