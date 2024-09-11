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
 * API call to save video file and make it part of moodle file
 *
 * @package    quizaccess_quizproctoring
 * @subpackage quizproctoring
 * @copyright  2020 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();
use quiz_attempt;
define('QUIZACCESS_QUIZPROCTORING_NOFACEDETECTED', 'nofacedetected');
define('QUIZACCESS_QUIZPROCTORING_MULTIFACESDETECTED', 'multifacesdetected');
define('QUIZACCESS_QUIZPROCTORING_FACESNOTMATCHED', 'facesnotmatched');
define('QUIZACCESS_QUIZPROCTORING_EYESNOTOPENED', 'eyesnotopened');
define('QUIZACCESS_QUIZPROCTORING_FACEMASKDETECTED', 'facemaskdetected');
define('QUIZACCESS_QUIZPROCTORING_MINIMIZEDETECTED', 'minimizedetected');
global $CFG;

require_once($CFG->libdir.'/externallib.php');

class quizaccess_quizproctoring_external extends external_api {
    
    /**
     * Describes the parameters for save_threshold_warning.
     *
     * @return external_function_parameters
     * @since Moodle 3.6
     */
    public static function save_threshold_warning_parameters() {
        return new external_function_parameters (
            array(
                'quizid'        => new external_value(PARAM_INT, 'Quiz ID', VALUE_REQUIRED),
                'attemptid'     => new external_value(PARAM_INT, 'Attempt Id', VALUE_REQUIRED)
            )
        );
    }

    /**
     * Requests save_threshold_warning.
     *
     * @return array save_threshold_warning
     * @since Moodle 3.6
     * @throws moodle_exception
     */
    public static function save_threshold_warning($quizid, $attemptid) {
        global $CFG, $USER, $COURSE, $DB;
        require_once($CFG->dirroot . '/mod/quiz/locallib.php');
        $params = self::validate_parameters(self::save_threshold_warning_parameters(),
                                            array(
                                                'quizid'        => $quizid,
                                                'attemptid'     => $attemptid
                                            ));

        $user = $DB->get_record('user', array('id' => $USER->id), '*', MUST_EXIST);
        $service = get_config('quizaccess_quizproctoring', 'serviceoption');
        $results = array();

        $record = new stdClass();
        $record->userid = $USER->id;
        $record->quizid = $quizid;
        $record->image_status = 'A';
        $record->aws_response = $service;
        $record->timecreated = time();
        $record->timemodified = time();
        $record->attemptid = $attemptid;
        $record->status = 'minimizedetected';
        $id = $DB->insert_record('quizaccess_proctor_data', $record);
        $quizaccessquizproctoring = $DB->get_record('quizaccess_quizproctoring', array('quizid' => $quizid));

        if (isset($quizaccessquizproctoring->warning_threshold) && $quizaccessquizproctoring->warning_threshold != 0) {
            $inparams = array('param1' => QUIZACCESS_QUIZPROCTORING_NOFACEDETECTED,
                'param2' => QUIZACCESS_QUIZPROCTORING_MULTIFACESDETECTED,
                'param3' => QUIZACCESS_QUIZPROCTORING_FACESNOTMATCHED,
                'param4' => QUIZACCESS_QUIZPROCTORING_FACEMASKDETECTED,
                'param5' => QUIZACCESS_QUIZPROCTORING_MINIMIZEDETECTED,
                'param6' => QUIZACCESS_QUIZPROCTORING_NOCAMERADETECTED,
                'param7' => QUIZACCESS_QUIZPROCTORING_EYESNOTOPENED,
                'userid' => $USER->id, 'quizid' => $quizid,
                'attemptid' => $attemptid, 'image_status' => 'A');
            $sql = "SELECT * from {quizaccess_proctor_data} where userid = :userid AND
            quizid = :quizid AND attemptid = :attemptid AND image_status = :image_status
            AND status IN (:param1,:param2,:param3,:param4,:param5,:param6,:param7)";
            $errorrecords = $DB->get_records_sql($sql, $inparams);

            if (count($errorrecords) >= $quizaccessquizproctoring->warning_threshold) {                
                // Submit quiz.
                $attemptobj = quiz_attempt::create($attemptid);
                $attemptobj->process_finish(time(), false);
                $results['url'] = $attemptobj->review_url()->out();
            } else {
                $left = $quizaccessquizproctoring->warning_threshold - count($errorrecords);
                if ($COURSE->lang == 'fr' || $COURSE->lang == 'fr_ca') {
                    if ($left == 1) {
                        $left = $left .get_string('avertissement', 'quizaccess_quizproctoring');
                    } else {
                        $left = $left .get_string('avertissements', 'quizaccess_quizproctoring');
                    }
                } else {
                    if ($left == 1) {
                        $left = $left . get_string('warning', 'quizaccess_quizproctoring');
                    } else {
                        $left = $left . get_string('warnings', 'quizaccess_quizproctoring');
                    }
                }
                $results['warning'] = get_string('minimizedetected', 'quizaccess_quizproctoring', $left);
            }
        }
        return $results;
    }

    /**
     * Describes the save_threshold_warning return value.
     *
     * @return external_single_structure
     * @since Moodle 3.6
     */
    public static function save_threshold_warning_returns() {
        return  new external_single_structure(
           array(
                'warning' => new external_value(PARAM_RAW, 'warning', VALUE_OPTIONAL),
                'url'     => new external_value(PARAM_RAW, 'url', VALUE_OPTIONAL),
            )
        );
    } 
}