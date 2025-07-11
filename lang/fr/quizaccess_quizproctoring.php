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
 * Strings for the quizaccess_quizproctoring plugin.
 *
 * @package    quizaccess_quizproctoring
 * @subpackage quizproctoring
 * @copyright  2020 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */


defined('MOODLE_INTERNAL') || die();

$string['accesstoken'] = 'Jeton du serveur externe';
$string['accesstoken_help'] = 'Jeton d\'accès généré à partir de l\'intégration du système du serveur externe';
$string['accesstokensecret'] = 'Jeton secret du serveur externe';
$string['accesstokensecret_help'] = 'Jeton secret généré à partir de l\'intégration du système du serveur externe';
$string['actions'] = 'Action';
$string['actions_help'] = 'Supprimer définitivement toutes les images associées à la tentative de cet utilisateur.';
$string['allimages'] = 'Toutes les images';
$string['attempts'] = 'Tentative';
$string['attemptslast'] = 'Dernière tentative';
$string['attemptstarted'] = 'Tentative commencée :';
$string['autosubmit'] = 'Le seuil d\'avertissement a été atteint. Votre quiz a été automatiquement soumis.';
$string['checkgetuserinfo'] = 'Vérifier les informations utilisateur';
$string['clear_images'] = 'Effacer toutes les images stockées après';
$string['clear_images_help'] = 'Après cette période, toutes les images stockées seront supprimées';
$string['clear_images_never'] = 'Jamais';
$string['clear_images_oneeighty'] = '6 mois';
$string['clear_images_oneyear'] = '1 an';
$string['clear_images_sixty'] = '3 mois';
$string['clear_images_thirty'] = '1 mois';
$string['clickpicture'] = 'Veuillez capturer votre photo avant de commencer l\'examen';
$string['confirmation'] = 'Confirmation';
$string['confirmationconcent'] = 'Je consens à la surveillance et à l\'enregistrement par webcam pendant ce quiz.';
$string['delcoursemages'] = 'Supprimer toutes les images stockées de {$a}';
$string['deleteallimages'] = 'Je comprends que ces images seront définitivement supprimées et ne pourront pas être récupérées.';
$string['deleteallimagescourse'] = 'Voulez-vous supprimer toutes les images associées au cours "{$a}" ? Veuillez noter que cette action est permanente et irréversible.<br/><br/>';
$string['deleteallimagesquiz'] = 'Voulez-vous supprimer toutes les images associées au quiz "{$a}" ? Veuillez noter que cette action est permanente et irréversible.<br/><br/>';
$string['deleteallimagesuser'] = 'Voulez-vous supprimer toutes les images associées à "{$a}" ? Veuillez noter que cette action est permanente et irréversible.<br/><br/>';
$string['deletestoredimagestask'] = 'Tâche de suppression des images stockées';
$string['delinformation'] = '<b>Rapport du quiz "{$a}" :</b> Vous pouvez supprimer toutes les images de ce quiz. Cela supprimera les images de tous les utilisateurs.';
$string['delinformationu'] = '<b>Rapport des images utilisateur :</b> Supprimer les images d\'un utilisateur de ce quiz. Toutes les images associées seront supprimées.';
$string['demovideo'] = 'Pour voir le processus complet, cliquez ici';
$string['duration'] = 'Durée';
$string['duration_help'] = 'Temps total passé sur cette tentative de quiz.';
$string['email'] = 'Adresse e-mail';
$string['enableeyecheckreal'] = 'Activer le suivi oculaire';
$string['enableeyecheckreal_help'] = 'Lorsqu\'il est activé, une alerte se déclenche si les yeux de l\'utilisateur sont fermés ou si la caméra perd le focus.';
$string['enableproctoring'] = 'Activer la surveillance pour ce quiz';
$string['enableproctoring_help'] = 'Lorsqu\'elle est activée, les utilisateurs doivent vérifier leur identité avant de commencer le quiz.';
$string['enableprofilematch'] = 'Activer la correspondance de la photo de profil';
$string['enableprofilematch_help'] = 'Lorsqu\'elle est activée, les utilisateurs doivent vérifier leur photo de profil avant de commencer le quiz.';
$string['enablestudentvideo'] = 'Activer la vidéo de l\'utilisateur pendant le quiz';
$string['enablestudentvideo_help'] = 'Lorsqu\'elle est activée, les utilisateurs peuvent voir leur propre vidéo pendant le quiz.';
$string['enableteacherproctor'] = 'Permettre au surveillant de voir les utilisateurs en ligne';
$string['enableteacherproctor_help'] = 'Lorsqu\'elle est activée, les surveillants peuvent voir le groupe d\'utilisateurs passant le quiz surveillé.';
$string['enableuploadidentity'] = 'Activer le téléchargement d\'identité';
$string['enableuploadidentity_help'] = 'Le téléchargement d\'une pièce d\'identité est facultatif. Le document est uniquement stocké à des fins de référence d\'identité. Aucune vérification automatique n\'est effectuée.';
$string['exportcsv'] = 'Exporter le rapport en CSV';
$string['exportpdf'] = 'Exporter le rapport en PDF';
$string['eyecheckrealnote'] = 'Remarque : Le suivi oculaire dépend de la vision et les résultats peuvent varier selon les traits du visage, les conditions d\'éclairage ou si l\'utilisateur porte des lunettes. Bien qu\'il améliore la surveillance, des incohérences peuvent survenir.';
$string['eyesnotopened'] = 'Yeux non concentrés. Veuillez rester concentré sur l\'écran. {$a}';
$string['facemaskdetected'] = 'Ne couvrez pas votre visage. {$a}';
$string['facesnotmatched'] = 'Votre image actuelle est différente de l\'image initiale. {$a}';
$string['fiftenminutes'] = '15 minutes';
$string['fiftenseconds'] = '15 secondes';
$string['fiveminutes'] = '5 minutes';
$string['fiveseconds'] = '5 secondes';
$string['fourminutes'] = '4 minutes';
$string['fullname'] = 'Nom complet';
$string['fullquizname'] = 'Nom du quiz';
$string['generate'] = 'Générer';
$string['generatereport'] = 'Générer le rapport';
$string['generatereport_help'] = 'Générer le rapport';
$string['help_timeinterval'] = 'Sélectionnez l\'intervalle de temps pour la surveillance d\'images';
$string['hoverhelptext'] = 'Retour à la liste des images utilisateur {$a}';
$string['imagesdeleted'] = 'Données supprimées avec succès';
$string['imgwarning'] = 'avertissement';
$string['isautosubmit'] = 'Échec de la surveillance';
$string['isautosubmit_help'] = 'Indique si le quiz a été automatiquement soumis après dépassement de tous les seuils d\'avertissement (Oui = Auto soumis).';
$string['iseyeoff'] = 'Suivi oculaire désactivé';
$string['iseyeoff_help'] = 'Indique si le suivi oculaire a été désactivé automatiquement pendant la session en raison d\'échecs répétés (ex. : lunettes, petits yeux, faible éclairage). "Oui" signifie que le suivi a été désactivé pour éviter les fausses alertes.';
$string['leftmovedetected'] = 'Regard vers la gauche pendant plus de 2 secondes. {$a}';
$string['mainimage'] = 'Image principale';
$string['minimizedetected'] = 'Ne quittez pas l\'onglet actif. {$a}';
$string['multifacesdetected'] = 'Plus d\'un visage détecté. {$a}';
$string['nocameradetected'] = 'Caméra ou microphone désactivé. Veuillez activer les deux pour continuer. {$a}';
$string['nocameradetectedm'] = 'Caméra ou microphone désactivé. Veuillez activer les deux pour continuer.';
$string['nofacedetected'] = 'Aucun visage détecté. {$a}';
$string['noimages'] = 'Aucune image';
$string['noimageswarning'] = 'Aucune image d\'avertissement n\'a été trouvée pendant l\'examen';
$string['norecordsfound'] = 'Aucun enregistrement trouvé.';
$string['nostudentonline'] = 'Aucun utilisateur en ligne';
$string['notcameradetected'] = 'Aucune caméra détectée.';
$string['notice'] = 'Remarque - Assurez-vous d\'être dans un environnement bien éclairé, avec votre visage clairement visible et sans ombres. Asseyez-vous devant un fond neutre ou dégagé sans mouvement ni distraction. Positionnez votre caméra au niveau des yeux pour capturer clairement l\'ensemble de votre visage sans obstruction.';
$string['notmatchedprofile'] = 'Votre image de profil ne correspond pas à votre image actuelle.';
$string['novideo'] = 'Aucune vidéo';
$string['oneminute'] = '1 minute';
$string['pluginname'] = 'Règle d\'accès au quiz ProctorLink';
$string['privacy:metadata'] = 'Le plugin de règle d\'accès au quiz surveillé ne stocke aucune donnée personnelle.';
$string['proctoring_image_show'] = 'Afficher les images de surveillance';
$string['proctoring_image_show_help'] = 'Si activé, les images de surveillance seront affichées sur la page de rapport.';
$string['proctoring_videolink'] = 'Lien vidéo de surveillance du quiz';
$string['proctoringerror'] = 'Ce quiz est configuré pour être tenté uniquement avec la surveillance.';
$string['proctoringidentity'] = 'Identité de surveillance';
$string['proctoringidentity_help'] = 'L\'identifiant ou l\'image téléchargée pour vérification avant de commencer le quiz.';
$string['proctoringimagereport'] = 'Voir le rapport global pour {$a}';
$string['proctoringimages'] = 'Images de surveillance';
$string['proctoringimages_help'] = 'Images capturées pendant la session de surveillance pour surveiller l\'activité de l\'utilisateur.';
$string['proctoringlink'] = 'Lien vidéo de surveillance';
$string['proctoringlink_help'] = 'Fournissez un lien vers une vidéo de démonstration présentant le processus de surveillance du quiz.';
$string['proctoringnotice'] = 'Ce quiz nécessite un accès surveillé pour les tentatives utilisateur.';
$string['proctoringreport'] = 'Rapport utilisateur de surveillance';
$string['proctoringtimeinterval'] = 'Intervalle de temps';
$string['proctoringtimeinterval_help'] = 'Définissez l\'intervalle de temps pour déterminer la fréquence des vérifications de surveillance pendant le quiz.';
$string['profilemandatory'] = 'La photo de profil est obligatoire. Veuillez la télécharger pour continuer.';
$string['quizaccess_quizproctoring'] = 'Rapport des images utilisateur';
$string['quizproctoring:quizproctoringonlinestudent'] = 'Voir les utilisateurs en ligne pendant la surveillance';
$string['quizproctoring:quizproctoringoverallreport'] = 'Voir le rapport de surveillance';
$string['quizproctoring:quizproctoringreport'] = 'Voir les boutons d\'images de surveillance et d\'identité';
$string['reqproctormsg'] = 'Veuillez capturer votre image';
$string['requiresafeexambrowser'] = 'Requiert l\'utilisation de Safe Exam Browser';
$string['retake'] = 'Repasser';
$string['reviewattempts'] = 'Revoir la tentative';
$string['reviewattempts_help'] = 'Consulter les journaux détaillés de cette tentative, y compris les alertes de surveillance et les activités suspectes.';
$string['reviewattemptsu'] = 'Revoir les images de la tentative pour {$a}';
$string['rightmovedetected'] = 'Regard vers la droite pendant plus de 2 secondes. {$a}';
$string['selectanswer'] = 'Veuillez sélectionner une réponse';
$string['serviceoption'] = 'Option du service de reconnaissance faciale';
$string['serviceoption_desc'] = 'Service pour comparer les visages';
$string['showprofileimage'] = 'Image de profil';
$string['showprofileimagemsg'] = 'Aucune photo de profil téléchargée';
$string['started'] = 'Commencé';
$string['started_help'] = 'Date et heure de début de la tentative de quiz.';
$string['storeallimages'] = 'Stocker toutes les images';
$string['storeallimages_help'] = 'Lorsqu\'elle est activée, toutes les images capturées pendant la session de surveillance sont stockées, et pas seulement celles déclenchant des alertes.';
$string['submitted'] = 'Soumis';
$string['submitted_help'] = 'Date et heure de soumission du quiz.';
$string['tabwarning'] = 'Ne quittez pas l\'onglet actif.';
$string['tabwarningoneleft'] = 'Ne quittez pas l\'onglet actif. Il ne vous reste qu\'un avertissement.';
$string['tabwarningmultiple'] = 'Ne quittez pas l\'onglet actif. Il vous reste {$a} avertissements.';
$string['takepicture'] = 'Prendre une photo';
$string['tenminutes'] = '10 minutes';
$string['tenseconds'] = '10 secondes';
$string['thirtyseconds'] = '30 secondes';
$string['threeminutes'] = '3 minutes';
$string['tokenerror'] = 'Jeton du serveur externe ou jeton secret invalide';
$string['twentyseconds'] = '20 secondes';
$string['twominutes'] = '2 minutes';
$string['uploadidentity'] = 'Veuillez télécharger une photo de votre pièce d\'identité';
$string['useridentityerror'] = 'Veuillez télécharger un fichier valide et capturer votre photo';
$string['userimagereport'] = 'Retour au rapport des images utilisateur';
$string['users'] = 'Utilisateurs totaux';
$string['usersimages'] = 'Images de l\'utilisateur';
$string['usersimages_help'] = 'Voir les miniatures de toutes les images capturées pendant la session de surveillance pour cet utilisateur.';
$string['usersimageswarning'] = 'Avertissements';
$string['usersimageswarning_help'] = 'Voir les miniatures de toutes les images d\'avertissement capturées pendant la session de surveillance pour cet utilisateur.';
$string['viewproctoringreport'] = 'Voir le rapport de surveillance';
$string['viewstudentonline'] = 'Voir les utilisateurs en ligne';
$string['warning'] = ' avertissement';
$string['warning_threshold'] = 'Seuil d\'avertissements pendant le quiz surveillé';
$string['warning_threshold_help'] = 'Définir le nombre maximum d\'avertissements autorisés avant disqualification.';
$string['warningaws'] = 'Veuillez compléter la <a href="{$a}">configuration AWS</a> pour continuer le quiz.';
$string['warningexpire'] = 'Le jeton pour votre service de surveillance Take2 a expiré. Veuillez nous contacter à <a href="mailto:ms@taketwotechnologies.com">ms@taketwotechnologies.com</a> pour le renouveler ou en générer un nouveau.';
$string['warningopensourse'] = 'Veuillez compléter la <a href="{$a}">configuration</a> pour continuer le quiz.';
$string['warnings'] = ' avertissements';
$string['warningsleft'] = 'Il vous reste {$a} avertissements.';
$string['warningstudent'] = 'Le quiz n\'est pas correctement configuré. Veuillez contacter l\'administrateur du site.';
$string['yes'] = 'Oui';
