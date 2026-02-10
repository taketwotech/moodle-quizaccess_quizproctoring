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
 * Backup instructions for the quizproctoring quiz access subplugin.
 *
 * @package    quizaccess_quizproctoring
 * @category   backup
 * @copyright  2026 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

require_once($CFG->dirroot . '/mod/quiz/backup/moodle2/backup_mod_quiz_access_subplugin.class.php');

/**
 * Backup instructions for the quizproctoring quiz access subplugin.
 *
 * @copyright  2026 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class backup_quizaccess_quizproctoring_subplugin extends backup_mod_quiz_access_subplugin {

    /**
     * Stores the data related to the quiz proctoring settings for a particular quiz.
     *
     * @return backup_subplugin_element
     */
    protected function define_quiz_subplugin_structure() {
        parent::define_quiz_subplugin_structure();
        $quizid = backup::VAR_ACTIVITYID;

        $subplugin = $this->get_subplugin_element();
        $subpluginwrapper = new backup_nested_element($this->get_recommended_name());

        $quizaccessproctoring = new backup_nested_element('quizaccess_quizproctoring_settings', null, [
            'enableproctoring',
            'time_interval',
            'warning_threshold',
            'proctoringvideo_link',
            'enableteacherproctor',
            'storeallimages',
            'enableprofilematch',
            'enablestudentvideo',
            'enableeyecheck',
            'enableuploadidentity',
            'enableeyecheckreal',
            'enablerecordaudio',
        ]);

        $subplugin->add_child($subpluginwrapper);
        $subpluginwrapper->add_child($quizaccessproctoring);

        $quizaccessproctoring->set_source_table('quizaccess_quizproctoring', ['quizid' => $quizid]);

        return $subplugin;
    }
}
