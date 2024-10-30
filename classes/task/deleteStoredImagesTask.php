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
 * Scheduled task for Clean Stored Images
 *
 * @package    quizaccess_quizproctoring
 * @subpackage quizproctoring
 * @copyright  2024 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
namespace quizaccess_quizproctoring\task;

use core\task\scheduled_task;
use Exception;
defined('MOODLE_INTERNAL') || die();

require_once($CFG->dirroot.'/mod/quiz/accessrule/quizproctoring/lib.php');

/**
 * Scheduled task for Clean Stored Images
 *
 * @copyright  2024 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class deleteStoredImagesTask extends scheduled_task {
    /**
     * Task Name
     *
     * @return string
     */
    public function get_name() {
        return get_string('deletestoredimagestask', 'quizaccess_quizproctoring');
    }

    /**
     * Execute Task.
     *
     * @return boolean
     */
    public function execute() {
        global $DB, $CFG;
         mtrace("Delete Stored Images started");
        try {
            clean_images_task();
        } catch (Exception $exception) {
            mtrace('error in delete stored images '.$exception->getMessage());
        }
        return true;
    }
}
