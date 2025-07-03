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
 * Scheduled task for move Stored Images into other folder
 *
 * @package    quizaccess_quizproctoring
 * @subpackage quizproctoring
 * @copyright  2025 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
namespace quizaccess_quizproctoring\task;

use core\task\scheduled_task;
use Exception;

/**
 * Scheduled task for Copy Main Images db data to new table
 *
 * @copyright  2025 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class mainImagesTask extends \core\task\adhoc_task {
    /**
     * Execute Task.
     *
     * @return boolean
     */
    public function execute() {
    	global $DB;
        
        mtrace("Running adhoc task Started");

        $sql = "SELECT * FROM {quizaccess_proctor_data}
                WHERE deleted = 0 AND image_status = 'M'
                ORDER BY id ASC";
        $records = $DB->get_records_sql($sql);
        foreach ($records as $record) {
            $newrecord = new \stdClass();
            $newrecord->userid = $record->userid;
            $newrecord->quizid = $record->quizid;
            $newrecord->user_identity = $record->user_identity;
            $newrecord->userimg = $record->userimg;
            $newrecord->image_status = $record->image_status;
            $newrecord->timecreated = $record->timecreated;
            $newrecord->timemodified = $record->timemodified;
            $newrecord->aws_response = $record->aws_response;
            $newrecord->attemptid = $record->attemptid;
            $newrecord->deleted = $record->deleted;
            $newrecord->status = $record->status;
            $newrecord->isautosubmit = $record->isautosubmit;
            $newrecord->response = $record->response;
            $DB->insert_record('quizaccess_main_proctor', $newrecord);
        }
        mtrace("Adhoc task completed successfully.");
    }
}
