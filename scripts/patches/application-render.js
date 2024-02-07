import { MODULE } from '../constants.js'

export function patchApplicationRender () {
    libWrapper.register(MODULE.ID, 'Application.prototype._render', renderPatch, 'OVERRIDE')
}

async function renderPatch (wrapper, force = false, options = {}) {
    // Do not render under certain conditions
    const states = Application.RENDER_STATES
    this._priorState = this._state
    if ([states.CLOSING, states.RENDERING].includes(this._state)) return

    // Applications which are not currently rendered must be forced
    if (!force && (this._state <= states.NONE)) return

    // Begin rendering the application
    if ([states.NONE, states.CLOSED, states.ERROR].includes(this._state)) {
        console.log(`${vtt} | Rendering ${this.constructor.name}`)
    }
    this._state = states.RENDERING

    // Merge provided options with those supported by the Application class
    foundry.utils.mergeObject(this.options, options, { insertKeys: false })
    options.focus ??= force

    // Get the existing HTML element and application data used for rendering
    const element = this.element
    const data = await this.getData(this.options)

    for (const cls of this.constructor._getInheritanceChain()) {
        Hooks.callAll(`preRender${cls.name}`, this, data)
    }

    // Store scroll positions
    if (element.length && this.options.scrollY) this._saveScrollPositions(element)

    // Render the inner content
    const inner = await this._renderInner(data)
    let html = inner

    // If the application already exists in the DOM, replace the inner content
    if (element.length) this._replaceHTML(element, html)

    // Otherwise render a new app
    else {
        // Wrap a popOut application in an outer frame
        if (this.popOut) {
            html = await this._renderOuter()
            html.find('.window-content').append(inner)
            ui.windows[this.appId] = this
        }

        // Add the HTML to the DOM and record the element
        this._injectHTML(html)
    }

    if (!this.popOut && this.options.resizable) new Draggable(this, html, false, this.options.resizable)

    // Activate event listeners on the inner HTML
    this._activateCoreListeners(inner)
    this.activateListeners(inner)

    // Set the application position (if it's not currently minimized)
    if (!this._minimized) {
        foundry.utils.mergeObject(this.position, options, { insertKeys: false })
        this.setPosition(this.position)
    }

    // Apply focus to the application, maximizing it and bringing it to the top
    if (this.popOut && (options.focus === true)) this.maximize().then(() => this.bringToTop())

    // Dispatch Hooks for rendering the base and subclass applications
    for (const cls of this.constructor._getInheritanceChain()) {
        Hooks.callAll(`render${cls.name}`, this, html, data)
    }

    // Restore prior scroll positions
    if (this.options.scrollY) this._restoreScrollPositions(html)
    this._state = states.RENDERED
}
