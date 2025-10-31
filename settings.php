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
 * Settings file for quizaccess proctoring
 *
 * @package    quizaccess_quizproctoring
 * @subpackage quizproctoring
 * @copyright  2020 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die;

if ($hassiteconfig && !empty($USER->id)) {
    // Mangeto Mapping Settings.
    $settings = new admin_settingpage(
        'modsettingsquizcatproctoring',
        get_string('pluginname', 'quizaccess_quizproctoring'),
        'moodle/site:config'
    );

    $choices = [
        'take2' => 'ProctorLink',
    ];
    $settings->add(new admin_setting_configselect(
        'quizaccess_quizproctoring/serviceoption',
        get_string('serviceoption', 'quizaccess_quizproctoring'),
        get_string('serviceoption_desc', 'quizaccess_quizproctoring'),
        'take2',
        $choices
    ));

    $settings->add(new admin_setting_configpasswordunmask(
        'quizaccess_quizproctoring/accesstoken',
        get_string('accesstoken', 'quizaccess_quizproctoring'),
        get_string('accesstoken_help', 'quizaccess_quizproctoring'),
        '8248fead-313a-e5ce-98ba-7eda26491031'
    ));

    $settings->add(new admin_setting_configpasswordunmask(
        'quizaccess_quizproctoring/accesstokensecret',
        get_string('accesstokensecret', 'quizaccess_quizproctoring'),
        get_string('accesstokensecret_help', 'quizaccess_quizproctoring'),
        '2a920af26e17652a557c27e8ab06d28cb63411346698737b633b10f7c42269da'
    ));

    $settings->add(new admin_setting_configselect(
        'quizaccess_quizproctoring/img_check_time',
        get_string('proctoringtimeinterval', 'quizaccess_quizproctoring'),
        get_string('help_timeinterval', 'quizaccess_quizproctoring'),
        15,
        [
            15 => get_string('fiftenseconds', 'quizaccess_quizproctoring'),
            30 => get_string('thirtyseconds', 'quizaccess_quizproctoring'),
            60 => get_string('oneminute', 'quizaccess_quizproctoring'),
            300 => get_string('fiveminutes', 'quizaccess_quizproctoring'),
        ]
    ));
}
