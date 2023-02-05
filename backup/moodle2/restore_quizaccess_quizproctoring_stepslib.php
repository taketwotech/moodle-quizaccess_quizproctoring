<?php

/**
 * @package    quizaccess
 * @subpackage quizproctoring
 * @subpackage backup-moodle2
 * @copyright  2020 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Define all the restore steps that will be used by the restore_pdfviewer_activity_task
 */

/**
 * Structure step to restore one quizaccess proctoring activity
 */
class restore_quizaccess_quizproctoring_activity_structure_step extends restore_activity_structure_step {

    protected function define_structure() {

        $paths = array();
        $paths[] = new restore_path_element('quizaccess_quizproctoring', '/activity/quizaccess_quizproctoring');

        // Return the paths wrapped into standard activity structure
        return $this->prepare_activity_structure($paths);
    }

    protected function process_quizaccess_quizproctoring($data) {
        global $DB;

        $data = (object)$data;
        $oldid = $data->id;
       
        //$data->course = $this->get_courseid();
        // Any changes to the list of dates that needs to be rolled should be same during course restore and course reset.
        // See MDL-9367.

        // insert the quizaccess proctoring record
        $newitemid = $DB->insert_record('quizaccess_quizproctoring', $data);
        // immediately after inserting "activity" record, call this
        $this->apply_activity_instance($newitemid);
    }

    protected function after_execute() {
        // Add quizaccess proctoring related files, no need to match by itemname (just internally handled context)
        $this->add_related_files('quizaccess_quizproctoring', 'intro', null);
    }
}
