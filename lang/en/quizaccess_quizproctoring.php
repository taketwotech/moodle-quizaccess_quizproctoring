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
 * Strings for the quizaccess_proctoring plugin.
 *
 * @package    quizaccess_quizproctoring
 * @subpackage proctoring
 * @copyright  2020 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */


defined('MOODLE_INTERNAL') || die();

$string['accesstoken'] = 'External Server Token';
$string['accesstoken_help'] = 'Access token generated from External Server System Integration';
$string['accesstokensecret'] = 'External Server Secret Token';
$string['accesstokensecret_help'] = 'Access secret generated from External Server System Integration';
$string['actions'] = 'Action';
$string['actions_help'] = 'Permanently remove all images associated with this user\'s attempt.';
$string['allimages'] = 'All Images';
$string['attempts'] = 'Attempt';
$string['attemptstarted'] = 'Attempt started:';
$string['autosubmit'] = 'The warning threshold has been reached. Your quiz has been automatically submitted.';
$string['awskey'] = 'AWS API Key';
$string['awskey_help'] = 'Enter AWS API key here to be used to access AWS services';
$string['awssecret'] = 'AWS Secret Key';
$string['awssecret_help'] = 'Enter AWS Secret here to be used to access AWS services';
$string['clear_images'] = 'Clear All Stored Images After';
$string['clear_images_help'] = 'After this period, All Stored Images will Clear';
$string['clear_images_never'] = 'Never';
$string['clear_images_oneeighty'] = '6 Months';
$string['clear_images_oneyear'] = '1 Year';
$string['clear_images_sixty'] = '3 Months';
$string['clear_images_thirty'] = '1 Month';
$string['clickpicture'] = 'Please capture your picture before starting the exam';
$string['confirmation'] = 'Confirmation';
$string['confirmationconcent'] = 'I consent to webcam monitoring and recording for proctoring during this quiz.';
$string['delcoursemages'] = 'Delete all stored images of {$a}';
$string['deleteallimages'] = 'I understand that these images will be permanently deleted and cannot be recovered.';
$string['deleteallimagescourse'] = 'Do you want to delete all images associated with "{$a}" course? Please be aware that this action is permanent and cannot be undone.<br/><br/>';
$string['deleteallimagesquiz'] = 'Do you want to delete all images associated with "{$a}" quiz? Please be aware that this action is permanent and cannot be undone.<br/><br/>';
$string['deleteallimagesuser'] = 'Do you want to delete all images associated with "{$a}"? Please be aware that this action is permanent and cannot be undone.<br/><br/>';
$string['deletestoredimagestask'] = 'Delete Stored Images Task';
$string['delinformation'] = '<b>"{$a}" Quiz Report:</b> You can remove all images from this quiz. This will delete images for all users.';
$string['delinformationu'] = '<b>User Images Report:</b> Remove a user\'s images from this quiz. All related images will be deleted.';
$string['demovideo'] = 'To watch full process, please click here';
$string['duration'] = 'Duration';
$string['duration_help'] = 'The total time spent on this quiz attempt.';
$string['email'] = 'Email Address';
$string['enableeyecheck'] = 'Enable eye tracking';
$string['enableeyecheck_help'] = ' When enabled, an alert triggers if the user\'s eyes are closed or if the camera loses focus.';
$string['enableproctoring'] = 'Enable proctoring with this quiz';
$string['enableproctoring_help'] = 'When enabled, users must verify their identity before starting the quiz.';
$string['enableprofilematch'] = 'Enable profile picture match';
$string['enableprofilematch_help'] = 'When enabled, users must verify their profile picture before starting the quiz.';
$string['enablestudentvideo'] = 'Enable user video during quiz';
$string['enablestudentvideo_help'] = 'When enabled, users can view their own video during the quiz.';
$string['enableteacherproctor'] = 'Allow proctor to view online users';
$string['enableteacherproctor_help'] = 'When enabled, proctors can view the group of users taking the proctored quiz.';
$string['eyesnotopened'] = 'Eyes not detected. Ensure your eyes are not obstructed. {$a}';
$string['facemaskdetected'] = 'Do not cover your face. {$a}';
$string['facesnotmatched'] = 'Your current image is different from the initial image. {$a}';
$string['fiftenminutes'] = '15 minutes';
$string['fiftenseconds'] = '15 seconds';
$string['fiveminutes'] = '5 minutes';
$string['fiveseconds'] = '5 seconds';
$string['fourminutes'] = '4 minutes';
$string['fullname'] = 'Full Name';
$string['fullquizname'] = 'Quiz Name';
$string['help_timeinterval'] = 'Select time interval for image Proctoring';
$string['hoverhelptext'] = 'Back to {$a} user image list';
$string['imagesdeleted'] = 'Data Deleted Successfully';
$string['imgwarning'] = 'warning';
$string['isautosubmit'] = 'Proctor Failed';
$string['isautosubmit_help'] = 'Indicates whether the quiz was automatically submitted after all the warning thresholds were exceeded (Yes = Auto Submitted).';
$string['leftmovedetected'] = 'Looking left for more than 2 seconds. {$a}';
$string['mainimage'] = 'Main Image';
$string['minimizedetected'] = 'Do not move away from active tab. {$a}';
$string['multifacesdetected'] = 'More than one face detected. {$a}';
$string['nocameradetected'] = 'No camera detected. {$a}';
$string['nofacedetected'] = 'No face detected. {$a}';
$string['noimages'] = 'No images';
$string['noimageswarning'] = 'No warning images were found during the exam';
$string['nostudentonline'] = 'No users are online';
$string['notcameradetected'] = 'No camera detected.';
$string['notice'] = 'Notice - Ensure you are in a well-lit environment with your face clearly visible and free from shadows. Sit in front of a plain or uncluttered background without any movement or distractions. Position your camera at eye level to capture your full face clearly, avoiding any obstructions.';
$string['notmatchedprofile'] = 'Your profile image does not match your current image.';
$string['novideo'] = 'No Videos';
$string['oneminute'] = '1 minute';
$string['pluginname'] = 'ProctorLink quiz access rule';
$string['privacy:metadata'] = 'The Proctoring quiz access rule plugin does not store any personal data.';
$string['proctoring_image_show'] = 'Show Proctoring Images';
$string['proctoring_image_show_help'] = 'If set, Proctoring Images can be displayed on Proctoring Report page.';
$string['proctoring_videolink'] = "Quiz proctoring video link";
$string['proctoringerror'] = 'This quiz has been set up so that it may only be attempted using the Proctoring.';
$string['proctoringidentity'] = 'Proctoring Identity';
$string['proctoringidentity_help'] = 'The ID or image uploaded for verification before starting the quiz.';
$string['proctoringimagereport'] = 'View Overall Report for {$a}';
$string['proctoringimages'] = 'Proctoring Images';
$string['proctoringimages_help'] = 'Images captured during the proctoring session for monitoring user activity.';
$string['proctoringlink'] = 'Proctoring video link';
$string['proctoringlink_help'] = "Provide a demo video link showcasing the quiz proctoring process.";
$string['proctoringnotice'] = 'This quiz is configured to require proctored access for user attempts.';
$string['proctoringreport'] = 'Proctoring User Report';
$string['proctoringtimeinterval'] = 'Time interval';
$string['proctoringtimeinterval_help'] = 'Set the time interval to define how frequently proctoring checks are performed during the quiz.';
$string['profilemandatory'] = 'Profile picture is required. Please upload your profile picture to proceed.';
$string['quizaccess_quizproctoring'] = 'User Images Report';
$string['quizproctoring:quizproctoringonlinestudent'] = 'View Online Students during Proctoring';
$string['quizproctoring:quizproctoringoverallreport'] = 'View Proctoring Report';
$string['quizproctoring:quizproctoringreport'] = 'View Proctoring Images and Proctoring Identity buttons';
$string['reqproctormsg'] = 'Please capture your image and upload ID proof';
$string['requiresafeexambrowser'] = 'Require the use of Safe Exam Browser';
$string['retake'] = 'Retake';
$string['reviewattempts'] = 'Review Attempt';
$string['reviewattempts_help'] = 'Review detailed logs of this user\'s attempt, including any proctoring alerts and suspicious activities.';
$string['reviewattemptsu'] = 'Review attempt images for {$a}';
$string['rightmovedetected'] = 'Looking right for more than 2 seconds. {$a}';
$string['selectanswer'] = 'Please select an answer';
$string['serviceoption'] = 'Facematch Service Option';
$string['serviceoption_desc'] = 'Service to match faces';
$string['showprofileimage'] = 'Profile Image';
$string['showprofileimagemsg'] = 'No profile picture uploaded';
$string['started'] = 'Started';
$string['started_help'] = 'The date and time when the quiz attempt began.';
$string['storeallimages'] = 'Store all images';
$string['storeallimages_help'] = 'When enabled, all images captured during proctoring sessions are stored, not just those triggering warnings.';
$string['submitted'] = 'Submitted';
$string['submitted_help'] = 'The date and time when the quiz was submitted.';
$string['takepicture'] = 'Take picture';
$string['tenminutes'] = '10 minutes';
$string['tenseconds'] = '10 seconds';
$string['thirtyseconds'] = '30 seconds';
$string['threeminutes'] = '3 minutes';
$string['tokenerror'] = 'Invalid External Server token or secret token';
$string['twentyseconds'] = '20 seconds';
$string['twominutes'] = '2 minutes';
$string['uploadidentity'] = 'Please upload a picture of your Photo ID';
$string['useridentityerror'] = 'Please upload a valid file and capture your picture';
$string['userimagereport'] = 'Back to User Images Report';
$string['users'] = 'Total Users';
$string['usersimages'] = 'User\'s Images';
$string['usersimages_help'] = 'View thumbnails of all images captured during the proctoring session for this user.';
$string['viewproctoringreport'] = 'View Proctoring Report';
$string['viewstudentonline'] = 'View Online Users';
$string['warning'] = ' warning';
$string['warning_threshold'] = 'Warnings threshold during proctored quiz';
$string['warning_threshold_help'] = 'Set the maximum number of warnings a user may recieve before being disqualified from the proctored quiz.';
$string['warningaws'] = 'Please complete <a href="{$a}">AWS configuration</a> to continue with quiz.';
$string['warningexpire'] = 'The token for your Take2 proctoring service has expired. Please reach out to us at <a href="mailto:ms@taketwotechnologies.com">ms@taketwotechnologies.com</a> to renew or generate a new token to ensure uninterrupted access.';
$string['warningopensourse'] = 'Please complete <a href="{$a}">configuration</a> to continue with quiz.';
$string['warnings'] = ' warnings';
$string['warningsleft'] = 'You have only {$a} left.';
$string['warningstudent'] = 'The quiz is not properly configured. Please contact site administrator.';
$string['yes'] = 'Yes';

