// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Modal helper compatible with Moodle 4.0 through 5.2.
 *
 * Moodle 5.x can serve core/modal_factory as ESM (no AMD define()), which
 * throws RequireJS "No define call". Prefer core/modal.create() and only
 * load modal_factory on older releases that still ship it as AMD.
 *
 * @module     quizaccess_quizproctoring/modal
 * @copyright  2020 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
define(['core/modal', 'core/modal_events'], function(ModalModule, ModalEventsModule) {
    /**
     * Unwrap an AMD or ESM-interop module export.
     *
     * @param {Object|Function} mod Loaded module
     * @return {Object|Function}
     */
    function unwrap(mod) {
        if (!mod) {
            return mod;
        }
        if (typeof mod.create === 'function' || typeof mod.hidden === 'string') {
            return mod;
        }
        if (mod.default) {
            return unwrap(mod.default);
        }
        return mod;
    }

    var Modal = unwrap(ModalModule);
    var ModalEvents = unwrap(ModalEventsModule) || ModalEventsModule;

    /**
     * Copy a config object, optionally dropping the legacy type key.
     *
     * @param {Object} config Modal config
     * @param {boolean} dropType Remove factory type
     * @return {Object}
     */
    function copyConfig(config, dropType) {
        var options = {};
        var key;
        config = config || {};
        for (key in config) {
            if (Object.prototype.hasOwnProperty.call(config, key)) {
                if (dropType && key === 'type') {
                    continue;
                }
                options[key] = config[key];
            }
        }
        return options;
    }

    /**
     * Create a default Moodle modal.
     *
     * @param {Object} config Modal configuration
     * @return {Promise}
     */
    function create(config) {
        if (Modal && typeof Modal.create === 'function') {
            return Promise.resolve(Modal.create(copyConfig(config, true)));
        }

        return new Promise(function(resolve, reject) {
            require(['core/modal_factory'], function(ModalFactoryModule) {
                var factory = unwrap(ModalFactoryModule) || ModalFactoryModule;
                if (factory && factory.default && typeof factory.default.create === 'function') {
                    factory = factory.default;
                }
                if (!factory || typeof factory.create !== 'function') {
                    reject(new Error('Unable to create modal'));
                    return;
                }
                var factoryConfig = copyConfig(config, false);
                if (!factoryConfig.type && factory.types && factory.types.DEFAULT) {
                    factoryConfig.type = factory.types.DEFAULT;
                }
                resolve(factory.create(factoryConfig));
            }, reject);
        });
    }

    return {
        create: create,
        types: {
            DEFAULT: 'DEFAULT'
        },
        events: ModalEvents
    };
});
