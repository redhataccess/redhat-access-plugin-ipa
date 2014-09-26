/**
 *   Authors:
 *    Petr Vobornik <pvoborni@redhat.com>
 *
 * Copyright (C) 2014 Red Hat
 * Licensed under Apache License 2.0
 */

define([
    'dojo/_base/lang',
    'dojo/_base/declare',
    'dojo/dom-construct',
    'dojo/dom-attr',
    'dojo/on',
    'freeipa/extend',
    'freeipa/navigation',
    'freeipa/navigation/routing',
    'freeipa/phases',
    'freeipa/reg',
    'freeipa/facets/Facet',
    'freeipa/widgets/DropdownWidget'
],function(lang, declare, construct, attr, on, extend, navigation, routing, phases, reg, Facet, DropdownWidget) {

/**
 * Red Hat Access Portal Integration
 *
 * @class rhaccess
 * @singleton
 */
var rhaccess = {

    menu_dropdown: null,

    facet_spec: {
        name: 'rhaccess',
        preferred_container: 'main',
        'class': 'container-fluid',
        widgets: [
            {
                $type: 'rhaccess',
                name: 'rhaccess'
            }
        ]
    },

    /**
     * Create and add dropdown menu to utility area of navigation
     */
    create_menu_dropdown: function() {

        this.menu_dropdown = new DropdownWidget({
            el_type:  'li',
            name: 'api-browser-menu',
            right_aligned: true,
            toggle_text: 'Red Hat Access',
            items: [
                {
                    name: 'search',
                    label: 'Search',
                    data: '/search'
                },
                {
                    'class': 'divider'
                },
                // {
                //     name: 'logs',
                //     label: 'Logs',
                //     data: '/logviewer'
                // },
                // {
                //     'class': 'divider'
                // },
                {
                    name: 'support',
                    label: 'Support',
                    items: [
                        {
                            name: 'new_case',
                            label: 'New Case',
                            data: '/case/new'
                        },
                        {
                            name: 'search_case',
                            label: 'Search Cases',
                            data: '/case/search'
                        },
                        {
                            name: 'cases',
                            label: 'List Cases',
                            data: '/case/list'
                        }
                    ]
                }
            ]
        });
        on(this.menu_dropdown, 'item-click', lang.hitch(this, this.on_dropdown_click));
        var el = this.menu_dropdown.render();
        extend.add_menu_utility(el);
    },

    on_dropdown_click: function (item) {

        // just pass hash to router
        var facet = reg.facet.get('rhaccess');
        navigation.show_generic(item.data, facet);
    },

    register: function () {
        var fa = reg.facet;
        var w = reg.widget;

        fa.register({
            type: 'rhaccess',
            ctor: Facet,
            spec: this.facet_spec
        });

        w.register('rhaccess', rhaccess.RHAApp);
        w.register_post_op('rhaccess', function(obj, spec, context) {
            obj.init();
            return obj;
        });
    },

    initialize: function () {

        this.create_menu_dropdown();
        var rh = new rhaccess.RouteHandler();
        routing.add_route('/search', rh);
        routing.add_route('/search/*urlparam', rh);
        routing.add_route('/case/*urlparam', rh);
        routing.add_route('/logviewer/*urlparam', rh);
        routing.add_route('/logviewer', rh);
        routing.assign_hash_creator('rhaccess', new rhaccess.HashCreator());
    }
};

/**
 * Red Hat Access Portal App
 * @class {RHAApp}
 */
rhaccess.RHAApp = declare([], {

    loaded: false,
    loading: false,

    path: 'js/plugins/rhaccess',

    init: function() {},

    /**
     * Load all dependencies
     *
     * Calls callback when it's done
     * @param  {Function} clb Callback
     */
    load: function(clb) {
        if (this.loaded || this.loading) return;

        this.loading = true;
        // little hack to disable AMD style of loading to prevent
        // strata.js from causing issues
        var org = window.define;
        delete window.define;

        window.ipa_loader.styles([
            this.path + '/styles/rhaccess.css'
        ]);

        var scripts = [
            this.path + '/rhaccess-deps.js'
        ];
        window.ipa_loader.scripts(scripts, lang.hitch(this, function() {
            this.loading = false;
            this.loaded = true;
            window.define = org;
            clb();
        }));
    },

    /**
     * Prepare attachment point for Red Hat Access Portal widget.
     */
    render: function() {

        this.dom_node = construct.create('div', {
            'class': 'row'
        });

        this.ngapp_node = construct.create('div', {}, this.dom_node);

        var ng = construct.create('div', {
            'ng-view': ''
        }, this.ngapp_node);

        construct.create('div', {
            id: 'rha-content',
            'ui-view': '',
            autoscroll: "false"
        }, ng);

        if (this.container_node) {
            construct.place(this.dom_node, this.container_node);
        }

        this.load(lang.hitch(this, function () {
            attr.set(this.ngapp_node, 'ng-app', 'RedhatAccess');
            this.init_app();
        }));


        return this.dom_node;
    },

    /**
     * Initialize Red Hat Access Portal widget
     */
    init_app: function() {

        window.strata.setRedhatClientID('redhat_access_plugin_ipa_7.1');

        window.angular.module('RedhatAccess', [
          'ngSanitize',
          'ui.select2',
          'RedhatAccess.header',
          'RedhatAccess.template',
          'RedhatAccess.cases',
          'RedhatAccess.security',
          'RedhatAccess.search',
          'RedhatAccess.logViewer',
          'RedhatAccess.ui-utils'
        ]).
        config(['$provide',
          function ($provide) {
            $provide.value('SECURITY_CONFIG', { displayLoginStatus: true, autoCheckLogin: true, forceLogin: false, loginURL:"", logoutURL:"" });
            $provide.value('NEW_DEFAULTS', { product: 'Red Hat Enterprise Linux', version: '7.1' });
          }
        ]).
        run(['TITLE_VIEW_CONFIG', '$http', 'securityService', 'gettextCatalog','CHAT_SUPPORT',
          function (TITLE_VIEW_CONFIG, $http, securityService, gettextCatalog,CHAT_SUPPORT) {
            TITLE_VIEW_CONFIG.show = true;
            CHAT_SUPPORT.enableChat = true;
          }
        ]);
        window.angular.bootstrap(this.ngapp_node, ['RedhatAccess']);
    }
});

/**
 * @class rhaccess.HashCreator
 * @extends {routing.HashCreator}
 */
rhaccess.HashCreator = declare([routing.HashCreator], {

    name: 'rhaccess',

    create_hash: function(router, facet, options) {

        var state = facet.state.clone();
        var hash = state.path || '/search';
        window.console.log(hash);
        return hash;
    }
});

/**
 * Custom route handler
 * @class rhaccess.RouteHandler
 * @extends {routing.RouteHandler}
 */
rhaccess.RouteHandler = declare([routing.RouteHandler], {

    name: 'rhaccess',

    /**
     * @inheritDoc
     */
    handle: function (event, router) {
        if (router.check_clear_ignore()) return;
        var facet = reg.facet.get('rhaccess');
        facet.reset_state({ path: event.new_path });
        router.show_facet(facet);
    }
});

phases.on('registration', lang.hitch(rhaccess, rhaccess.register));
phases.on('init', lang.hitch(rhaccess, rhaccess.initialize), 20);

    return rhaccess;
});