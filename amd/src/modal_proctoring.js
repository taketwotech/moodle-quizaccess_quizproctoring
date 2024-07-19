import $ from 'jquery';
import Modal from 'core/modal';
import * as CustomEvents from 'core/custom_interaction_events';

const SELECTORS = {
    PREVIOUS_BUTTON: '[data-action="previous"]',
    NEXT_BUTTON: '[data-action="next"]',
};

export default class ModalProctoringImages extends Modal {
    static TYPE = 'quizaccess_quizproctoring-res';
    static TEMPLATE = 'quizaccess_quizproctoring/response_modal';

    registerEventListeners() {
        super.registerEventListeners(this);
        this.getModal().on(CustomEvents.events.activate, SELECTORS.PREVIOUS_BUTTON, function(e) {
            $(document).trigger('prev');
            e.preventDefault();
        });
        this.getModal().on(CustomEvents.events.activate, SELECTORS.NEXT_BUTTON, function(e) {
            $(document).trigger('next');
            e.preventDefault();
        });
    }
}
ModalProctoringImages.registerModalType();