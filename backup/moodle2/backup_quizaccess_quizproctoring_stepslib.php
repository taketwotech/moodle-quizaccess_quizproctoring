<?php

/**
 *
 * Define all the backup steps that will be used by the backup_pdfviewer_activity_task
 *
 * @package    quizaccess
 * @subpackage quizproctoring
 * @copyright  2020 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die;

 /**
 * Define the complete quizaccess proctoring structure for backup, with file and id annotations
 */
class backup_quizaccess_quizproctoring_activity_structure_step extends backup_activity_structure_step {

    protected function define_structure() {

        //the URL module stores no user info

        // Define each element separated
        $quizaccess_quizproctoring = new backup_nested_element('quizaccess_quizproctoring', array('id'), array(
            'quizid', 'enableproctoring', 'time_interval'));

        // Define sources
        $quizaccess_quizproctoring->set_source_table('quizaccess_quizproctoring', array('id' => backup::VAR_ACTIVITYID));

        // Return the root element (quizaccess_quizproctoring), wrapped into standard activity structure
        return $this->prepare_activity_structure($quizaccess_quizproctoring);

    }
}
