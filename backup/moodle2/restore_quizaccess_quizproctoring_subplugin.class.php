<?php
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
 * Restore instructions for the quizproctoring quiz access subplugin.
 *
 * @package    quizaccess_quizproctoring
 * @category   backup
 * @copyright  2026 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

require_once($CFG->dirroot . '/mod/quiz/backup/moodle2/restore_mod_quiz_access_subplugin.class.php');

/**
 * Restore instructions for the quizproctoring quiz access subplugin.
 *
 * @copyright  2026 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class restore_quizaccess_quizproctoring_subplugin extends restore_mod_quiz_access_subplugin {

    /**
     * Provides path structure required to restore quiz proctoring settings.
     *
     * @return array
     */
    protected function define_quiz_subplugin_structure() {
        $paths = [];

        $path = $this->get_pathfor('/quizaccess_quizproctoring_settings');
        $paths[] = new restore_path_element('quizaccess_quizproctoring_settings', $path);

        return $paths;
    }

    /**
     * Process the restored data for the quizaccess_quizproctoring table.
     *
     * @param stdClass $data Data for quizaccess_quizproctoring retrieved from backup xml.
     */
    public function process_quizaccess_quizproctoring_settings($data) {
        global $DB;

        $data = (object) $data;
        $data->quizid = $this->get_new_parentid('quiz');
        unset($data->id);

        if (!isset($data->enableproctoring)) {
            $data->enableproctoring = 0;
        }
        if (!isset($data->enableteacherproctor)) {
            $data->enableteacherproctor = 0;
        }
        if (!isset($data->storeallimages)) {
            $data->storeallimages = 0;
        }
        if (!isset($data->enableprofilematch)) {
            $data->enableprofilematch = 0;
        }
        if (!isset($data->enablestudentvideo)) {
            $data->enablestudentvideo = 0;
        }
        if (!isset($data->enableeyecheck)) {
            $data->enableeyecheck = 0;
        }
        if (!isset($data->enableuploadidentity)) {
            $data->enableuploadidentity = 0;
        }
        if (!isset($data->enableeyecheckreal)) {
            $data->enableeyecheckreal = 0;
        }
        if (!isset($data->enablerecordaudio)) {
            $data->enablerecordaudio = 0;
        }
        if (!isset($data->time_interval)) {
            $data->time_interval = null;
        }
        if (!isset($data->warning_threshold)) {
            $data->warning_threshold = null;
        }
        if (!isset($data->warning_email_threshold)) {
            $data->warning_email_threshold = 0;
        }
        if (!isset($data->warning_email_trigger_role)) {
            $data->warning_email_trigger_role = 0;
        }
        if (!isset($data->proctoringvideo_link)) {
            $data->proctoringvideo_link = null;
        }

        $DB->delete_records('quizaccess_quizproctoring', ['quizid' => $data->quizid]);
        $DB->insert_record('quizaccess_quizproctoring', $data);
    }
}
