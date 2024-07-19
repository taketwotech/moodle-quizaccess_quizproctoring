define(['jquery', 'core/modal', 'core/modal_registry'], function($, Modal, ModalRegistry) {
    var registered = false;
        var SELECTORS = {
            PREVIOUS_BUTTON: '[data-action="previous"]',
            NEXT_BUTTON: '[data-action="next"]',
        };

    var ModalProctoring = function(root) {
        Modal.call(this, root);
        if (!this.getFooter().find(SELECTORS.PREVIOUS_BUTTON).length) {
                 Notification.exception({message: 'No previous button found'});
            }

            if (!this.getFooter().find(SELECTORS.NEXT_BUTTON).length) {
                Notification.exception({message: 'No next button found'});
            }
    };

    ModalProctoring.prototype = Object.create(Modal.prototype);
    ModalProctoring.prototype.constructor = ModalProctoring;

/**
         * Set up all of the event handling for the modal.
         *
         * @method registerEventListeners
         */
        ModalProctoring.prototype.registerEventListeners = function() {
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
    return ModalProctoring;
});
