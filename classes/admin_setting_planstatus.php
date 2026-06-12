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
 * Admin setting that renders live ProctorLink plan status with a refresh action.
 *
 * @package    quizaccess_quizproctoring
 * @copyright  2026 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace quizaccess_quizproctoring;

defined('MOODLE_INTERNAL') || die();

global $CFG;
require_once($CFG->libdir . '/adminlib.php');

/**
 * Renders plan status HTML when the admin settings page is displayed.
 */
class admin_setting_planstatus extends \admin_setting_description {
    /**
     * @param string $name Setting name.
     * @param string $visiblename Visible label.
     */
    public function __construct(string $name, string $visiblename) {
        parent::__construct($name, $visiblename, '');
    }

    /**
     * @param string $data
     * @param string $query
     * @return string
     */
    public function output_html($data, $query = '') {
        global $CFG, $OUTPUT;
        require_once($CFG->dirroot . '/mod/quiz/accessrule/quizproctoring/lib.php');

        quizaccess_quizproctoring_sync_plan_if_stale();
        $refreshurl = quizaccess_quizproctoring_plan_refresh_url();
        $description = '<div class="planstatus">' . quizaccess_quizproctoring_render_plan_status($refreshurl) . '</div>';

        $context = (object) [
            'title' => $this->visiblename,
            'description' => $description,
        ];

        return $OUTPUT->render_from_template('core_admin/setting_description', $context);
    }
}
