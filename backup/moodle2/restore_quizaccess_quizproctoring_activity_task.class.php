<?php

/**
 * @package    quizaccess
 * @subpackage quizproctoring
 * @subpackage backup-moodle2
 * @copyright  2020 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

require_once($CFG->dirroot . '/mod/quiz/quizproctoring/backup/moodle2/restore_quizaccess_quizproctoring_stepslib.php'); // Because it exists (must)

/**
 * quizaccess proctoring restore task that provides all the settings and steps to perform one
 * complete restore of the activity
 */
class restore_quizaccess_quizproctoring_subplugin extends restore_subplugin {

    /**
     * Define (add) particular settings this activity can have
     */
    protected function define_my_settings() {
        // No particular settings for this activity
    }

    /**
     * Define (add) particular steps this activity can have
     */
    protected function define_attempt_subplugin_structure() {
        // quizaccess proctoring only has one structure
        $this->add_step(new restore_quizaccess_quizproctoring_activity_structure_step('quizaccess_quizproctoring_structure', 'quizaccess_quizproctoring.xml'));
    }
}
