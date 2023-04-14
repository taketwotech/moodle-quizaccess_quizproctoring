define(['jquery', 'core/notification', 'core/custom_interaction_events', 'core/modal', 'core/modal_registry'],
    function($, Notification, CustomEvents, Modal, ModalRegistry) {

        var registered = false;
        var SELECTORS = {
            PREVIOUS_BUTTON: '[data-action="previous"]',
            NEXT_BUTTON: '[data-action="next"]',
        };

        /**
         * Constructor for the Modal.
         *
         * @param {object} root The root jQuery element for the modal
         */
        var ModalResponse = function(root) {
            Modal.call(this, root);

            if (!this.getFooter().find(SELECTORS.PREVIOUS_BUTTON).length) {
                 Notification.exception({message: 'No previous button found'});
            }

            if (!this.getFooter().find(SELECTORS.NEXT_BUTTON).length) {
                Notification.exception({message: 'No next button found'});
            }
        };

        ModalResponse.TYPE = 'quizaccess_quizproctoring-response';
        ModalResponse.prototype = Object.create(Modal.prototype);
        ModalResponse.prototype.constructor = ModalResponse;

        /**
         * Set up all of the event handling for the modal.
         *
         * @method registerEventListeners
         */
        ModalResponse.prototype.registerEventListeners = function() {
            // Apply parent event listeners.
            Modal.prototype.registerEventListeners.call(this);
            this.getModal().on(CustomEvents.events.activate, SELECTORS.PREVIOUS_BUTTON, function(e) {
                $(document).trigger('prev');
                e.preventDefault();
            });
            this.getModal().on(CustomEvents.events.activate, SELECTORS.NEXT_BUTTON, function(e) {
                $(document).trigger('next');
                e.preventDefault();
            });
        };

        // Automatically register with the modal registry the first time this module is imported so that you can create modals
        // of this type using the modal factory.
        if (!registered) {
            ModalRegistry.register(ModalResponse.TYPE, ModalResponse, 'quizaccess_quizproctoring/response_modal');
            registered = true;
        }

        return ModalResponse;
    });