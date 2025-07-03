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
 * Scheduled task for Copy Images from temp to proctorlink folder
 *
 * @copyright  2025 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class images_adhoc_task extends \core\task\adhoc_task {
    /**
     * Execute Task.
     *
     * @return boolean
     */
    public function execute() {
    	global $CFG;        
        
        mtrace("Running adhoc task Started");

        $sourceDir = make_temp_directory('quizaccess_quizproctoring/captured');
        $destinationDir = $CFG->dataroot . '/proctorlink';
        if (!file_exists($destinationDir)) {
            mkdir($destinationDir, 0777, true);
        }

        $files = glob($sourceDir . '/*');
        foreach ($files as $file) {
            if (is_file($file)) {
                $basename = basename($file);
                $destinationPath = $destinationDir . '/' . $basename;

                if (copy($file, $destinationPath)) {
                    mtrace("Copied: $basename");
                } else {
                    mtrace("Failed to copy: $basename");
                }
            }
        }

        mtrace("Adhoc task completed successfully.");
    }
}