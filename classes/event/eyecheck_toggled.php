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
 * Event for when a teacher toggles eye‑check for a quiz attempt.
 *
 * @package    quizaccess_quizproctoring
 * @copyright  2024 Mahendra Soni
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace quizaccess_quizproctoring\event;

defined('MOODLE_INTERNAL') || die();

use core\event\base;

/**
 * Event fired when eye‑tracking is enabled/disabled by a teacher.
 *
 * @package    quizaccess_quizproctoring
 */
class eyecheck_toggled extends base {

    /**
     * Init the event.
     *
     * @return void
     */
    protected function init() {
        $this->data['crud'] = 'u'; // Update.
        $this->data['edulevel'] = self::LEVEL_TEACHING;
        $this->data['objecttable'] = 'quizaccess_main_proctor';
    }

    /**
     * Returns localised event name.
     *
     * @return string
     */
    public static function get_name() {
        return get_string('eventeyechecktoggled', 'quizaccess_quizproctoring');
    }

    /**
     * Returns non-localised event description with id numbers for admin use only.
     *
     * @return string
     */
    public function get_description() {
        $data = $this->get_data();
        $status = isset($data['other']['status']) ? $data['other']['status'] : 'unknown';

        return "The eye-check status for attempt ID '{$this->objectid}' was toggled to '{$status}'.";
    }

    /**
     * Return the legacy log data.
     *
     * @return array
     */
    protected function get_legacy_logdata() {
        return [
            $this->courseid,
            'quiz',
            'eyecheck toggled',
            '',
            $this->objectid,
            $this->contextinstanceid,
        ];
    }
}



