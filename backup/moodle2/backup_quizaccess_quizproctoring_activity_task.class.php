<?php

/**
 * Defines backup_quizaccess_quizproctoring_subplugin class
 *
 * @package    quizaccess
 * @subpackage quizproctoring
 * @category   backup
 * @copyright  2020 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die;

require_once($CFG->dirroot . '/mod/quiz/quizproctoring/backup/moodle2/backup_quizaccess_quizproctoring_stepslib.php');

/**
 * Provides all the settings and steps to perform one complete backup of the activity
 */
class backup_quizaccess_quizproctoring_subplugin extends backup_subplugin {

    /**
     * No specific settings for this activity
     */
    protected function define_quiz_subplugin_structure() {
    }

    /**
     * Defines a backup step to store the instance data in the quizaccess_quizproctoring.xml file
     */
    protected function define_attempt_subplugin_structure() {
            $this->add_step(new backup_quizaccess_quizproctoring_activity_structure_step('quizaccess_quizproctoring_structure', 'quizaccess_quizproctoring.xml'));
    }
}
