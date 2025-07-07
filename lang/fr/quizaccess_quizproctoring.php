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

$string['accesstoken'] = 'Jeton de serveur externe';
$string['accesstoken_help'] = 'Jeton d\'accès généré à partir de l\'intégration du système de serveur externe';
$string['accesstokensecret'] = 'Jeton secret du serveur externe';
$string['accesstokensecret_help'] = 'Secret d\'accès généré à partir de l\'intégration du système de serveur externe';
$string['actions'] = 'Action';
$string['actions_help'] = 'Supprimer définitivement toutes les images associées à la tentative de cet utilisateur.';
$string['allimages'] = 'Toutes les images';
$string['attempts'] = 'Tentative';
$string['attemptslast'] = 'Dernière tentative';
$string['attemptstarted'] = 'Tentative commencée :';
$string['autosubmit'] = 'Le seuil d\'avertissement a été atteint. Votre test a été soumis automatiquement.';
$string['checkgetuserinfo'] = 'Vérifier les informations utilisateur';
$string['clear_images'] = 'Effacer toutes les images stockées après';
$string['clear_images_help'] = 'Après cette période, toutes les images stockées seront effacées';
$string['clear_images_never'] = 'Jamais';
$string['clear_images_oneeighty'] = '6 mois';
$string['clear_images_oneyear'] = '1 an';
$string['clear_images_sixty'] = '3 mois';
$string['clear_images_thirty'] = '1 mois';
$string['clickpicture'] = 'Veuillez capturer votre photo avant de commencer l\'examen';
$string['confirmation'] = 'Confirmation';
$string['confirmationconcent'] = 'Je consens à la surveillance et à l\'enregistrement par webcam pendant ce test.';
$string['delcoursemages'] = 'Supprimer toutes les images enregistrées de {$a}';
$string['deleteallimages'] = 'Je comprends que ces images seront définitivement supprimées et ne pourront pas être récupérées.';
$string['deleteallimagescourse'] = 'Souhaitez-vous supprimer toutes les images associées au cours "{$a}" ? Veuillez noter que cette action est permanente et ne peut pas être annulée.<br/><br/>';
$string['deleteallimagesquiz'] = 'Souhaitez-vous supprimer toutes les images associées au test "{$a}" ? Veuillez noter que cette action est permanente et ne peut pas être annulée.<br/><br/>';
$string['deleteallimagesuser'] = 'Souhaitez-vous supprimer toutes les images associées à "{$a}" ? Veuillez noter que cette action est permanente et ne peut pas être annulée.<br/><br/>';
$string['deletestoredimagestask'] = 'Tâche de suppression des images stockées';
$string['delinformation'] = '<b>"{$a}" Rapport de test :</b> Vous pouvez supprimer toutes les images de ce test. Cela supprimera les images de tous les utilisateurs.';
$string['delinformationu'] = '<b>Rapport des images utilisateur :</b> Supprimer les images d\'un utilisateur de ce test. Toutes les images associées seront supprimées.';
$string['demovideo'] = 'Pour regarder le processus complet, cliquez ici';
$string['duration'] = 'Durée';
$string['duration_help'] = 'Temps total passé sur cette tentative de test.';
$string['email'] = 'Adresse e-mail';
$string['enableeyecheckreal'] = 'Activer le suivi oculaire';
$string['enableeyecheckreal_help'] = 'Lorsqu\'il est activé, une alerte se déclenche si les yeux de l\'utilisateur sont fermés ou si la caméra perd la mise au point.';
$string['enableproctoring'] = 'Activer la surveillance pour ce test';
$string['enableproctoring_help'] = 'Lorsqu\'il est activé, les utilisateurs doivent vérifier leur identité avant de commencer le test.';
$string['enableprofilematch'] = 'Activer la correspondance de la photo de profil';
$string['enableprofilematch_help'] = 'Lorsqu\'il est activé, les utilisateurs doivent vérifier leur photo de profil avant de commencer le test.';
$string['enablestudentvideo'] = 'Activer la vidéo utilisateur pendant le test';
$string['enablestudentvideo_help'] = 'Lorsqu\'il est activé, les utilisateurs peuvent voir leur propre vidéo pendant le test.';
$string['enableteacherproctor'] = 'Autoriser le surveillant à voir les utilisateurs en ligne';
$string['enableteacherproctor_help'] = 'Lorsqu\'il est activé, les surveillants peuvent voir le groupe d\'utilisateurs passant le test surveillé.';
$string['enableuploadidentity'] = 'Activer le téléchargement d\'une pièce d\'identité';
$string['enableuploadidentity_help'] = 'Le téléchargement d\'une pièce d\'identité est facultatif. Le document téléchargé est uniquement stocké à des fins de référence d\'identité. Aucune comparaison ou vérification automatique n\'est effectuée.';
$string['exportcsv'] = 'Exporter le rapport en CSV';
$string['exportpdf'] = 'Exporter le rapport en PDF';
$string['eyecheckrealnote'] = 'Remarque : Le suivi oculaire dépend de la vision et les résultats peuvent varier selon les traits du visage, l\'éclairage ou le port de lunettes. Bien qu\'il améliore la surveillance, des incohérences occasionnelles peuvent survenir.';
$string['eyesnotopened'] = 'Yeux non focalisés. Veuillez rester concentré sur l\'écran. {$a}';
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
$string['help_timeinterval'] = 'Sélectionnez l\'intervalle de temps pour la surveillance par image';
$string['hoverhelptext'] = 'Retour à la liste des images de l\'utilisateur {$a}';
$string['imagesdeleted'] = 'Données supprimées avec succès';
$string['imgwarning'] = 'avertissement';
$string['isautosubmit'] = 'Surveillance échouée';
$string['isautosubmit_help'] = 'Indique si le quiz a été soumis automatiquement après dépassement de tous les seuils d\'avertissement (Oui = Auto soumis).';
$string['iseyeoff'] = 'Suivi des yeux désactivé';
$string['iseyeoff_help'] = 'Indique si le suivi oculaire a été automatiquement désactivé pendant la session en raison d\'échecs répétés (par ex. : lunettes, petits yeux, faible éclairage). "Oui" signifie que le suivi a été désactivé pour éviter les fausses alertes.';
$string['leftmovedetected'] = 'Regard vers la gauche pendant plus de 2 secondes. {$a}';
$string['mainimage'] = 'Image principale';
$string['minimizedetected'] = 'Ne quittez pas l\'onglet actif. {$a}';
$string['multifacesdetected'] = 'Plus d\'un visage détecté. {$a}';
$string['nocameradetected'] = 'Aucune caméra détectée. {$a}';
$string['nofacedetected'] = 'Aucun visage détecté. {$a}';
$string['noimages'] = 'Aucune image';
$string['noimageswarning'] = 'Aucune image d\'avertissement trouvée pendant l\'examen';
$string['norecordsfound'] = 'Aucun enregistrement trouvé.';
$string['nostudentonline'] = 'Aucun utilisateur en ligne';
$string['notcameradetected'] = 'Aucune caméra détectée.';
$string['notice'] = 'Remarque - Assurez-vous d\'être dans un environnement bien éclairé, avec votre visage clairement visible, sans ombre. Asseyez-vous devant un fond simple ou non encombré, sans mouvement ni distraction. Placez votre caméra au niveau des yeux pour bien capturer votre visage, sans obstruction.';
$string['notmatchedprofile'] = 'Votre image de profil ne correspond pas à votre image actuelle.';
$string['novideo'] = 'Aucune vidéo';
$string['oneminute'] = '1 minute';
$string['pluginname'] = 'Règle d\'accès ProctorLink au quiz';
$string['privacy:metadata'] = 'Le plugin de règle d\'accès au quiz Proctoring ne stocke aucune donnée personnelle.';
$string['proctoring_image_show'] = 'Afficher les images de surveillance';
$string['proctoring_image_show_help'] = 'Si activé, les images de surveillance peuvent être affichées sur la page du rapport de surveillance.';
$string['proctoring_videolink'] = 'Lien vidéo de surveillance du quiz';
$string['proctoringerror'] = 'Ce quiz est configuré pour être tenté uniquement en utilisant la surveillance.';
$string['proctoringidentity'] = 'Identité de surveillance';
$string['proctoringidentity_help'] = 'L\'identifiant ou l\'image téléchargée pour vérification avant de commencer le quiz.';
$string['proctoringimagereport'] = 'Voir le rapport global pour {$a}';
$string['proctoringimages'] = 'Images de surveillance';
$string['proctoringimages_help'] = 'Images capturées pendant la session de surveillance pour suivre l\'activité de l\'utilisateur.';
$string['proctoringlink'] = 'Lien vidéo de surveillance';
$string['proctoringlink_help'] = 'Fournissez un lien vidéo de démonstration illustrant le processus de surveillance du quiz.';
$string['proctoringnotice'] = 'Ce quiz nécessite un accès surveillé pour les tentatives utilisateur.';
$string['proctoringreport'] = 'Rapport utilisateur de surveillance';
$string['proctoringtimeinterval'] = 'Intervalle de temps';
$string['proctoringtimeinterval_help'] = 'Définissez l\'intervalle pour déterminer la fréquence de vérification pendant le quiz.';
$string['profilemandatory'] = 'La photo de profil est requise. Veuillez la télécharger pour continuer.';
$string['quizaccess_quizproctoring'] = 'Rapport des images utilisateur';
$string['quizproctoring:quizproctoringonlinestudent'] = 'Voir les étudiants en ligne pendant la surveillance';
$string['quizproctoring:quizproctoringoverallreport'] = 'Voir le rapport de surveillance';
$string['quizproctoring:quizproctoringreport'] = 'Voir les boutons Images de surveillance et Identité de surveillance';
$string['reqproctormsg'] = 'Veuillez capturer votre image';
$string['requiresafeexambrowser'] = 'Exiger l\'utilisation de Safe Exam Browser';
$string['retake'] = 'Reprendre';
$string['reviewattempts'] = 'Revoir la tentative';
$string['reviewattempts_help'] = 'Consulter les journaux détaillés de la tentative de l\'utilisateur, y compris les alertes et les activités suspectes.';
$string['reviewattemptsu'] = 'Revoir les images de tentative pour {$a}';
$string['rightmovedetected'] = 'Regard vers la droite pendant plus de 2 secondes. {$a}';
$string['selectanswer'] = 'Veuillez sélectionner une réponse';
$string['serviceoption'] = 'Option du service de reconnaissance faciale';
$string['serviceoption_desc'] = 'Service de comparaison faciale';
$string['showprofileimage'] = 'Image de profil';
$string['showprofileimagemsg'] = 'Aucune photo de profil téléchargée';
$string['started'] = 'Commencé';
$string['started_help'] = 'Date et heure de début de la tentative du quiz.';
$string['storeallimages'] = 'Stocker toutes les images';
$string['storeallimages_help'] = 'Si activé, toutes les images capturées pendant les sessions de surveillance sont stockées, pas seulement celles générant des alertes.';
$string['submitted'] = 'Soumis';
$string['submitted_help'] = 'Date et heure de soumission du quiz.';
$string['takepicture'] = 'Prendre une photo';
$string['tenminutes'] = '10 minutes';
$string['tenseconds'] = '10 secondes';
$string['thirtyseconds'] = '30 secondes';
$string['threeminutes'] = '3 minutes';
$string['tokenerror'] = 'Jeton du serveur externe invalide ou secret incorrect';
$string['twentyseconds'] = '20 secondes';
$string['twominutes'] = '2 minutes';
$string['uploadidentity'] = 'Veuillez télécharger une photo de votre pièce d\'identité';
$string['useridentityerror'] = 'Veuillez télécharger un fichier valide et capturer votre photo';
$string['userimagereport'] = 'Retour au rapport des images utilisateur';
$string['users'] = 'Nombre total d\'utilisateurs';
$string['usersimages'] = 'Images de l\'utilisateur';
$string['usersimages_help'] = 'Voir les vignettes de toutes les images capturées pendant la session de surveillance pour cet utilisateur.';
$string['usersimageswarning'] = 'Avertissements';
$string['usersimageswarning_help'] = 'Voir les vignettes des images générant des alertes pendant la session de surveillance.';
$string['viewproctoringreport'] = 'Voir le rapport de surveillance';
$string['viewstudentonline'] = 'Voir les utilisateurs en ligne';
$string['warning'] = ' avertissement';
$string['warning_threshold'] = 'Seuil d\'avertissements pendant le quiz surveillé';
$string['warning_threshold_help'] = 'Définir le nombre maximal d\'avertissements autorisés avant disqualification.';
$string['warningaws'] = 'Veuillez compléter la <a href="{$a}">configuration AWS</a> pour continuer le quiz.';
$string['warningexpire'] = 'Le jeton de votre service de surveillance Take2 a expiré. Veuillez nous contacter à <a href="mailto:ms@taketwotechnologies.com">ms@taketwotechnologies.com</a> pour renouveler ou générer un nouveau jeton afin d\'assurer un accès ininterrompu.';
$string['warningopensourse'] = 'Veuillez compléter la <a href="{$a}">configuration</a> pour continuer le quiz.';
$string['warnings'] = ' avertissements';
$string['warningsleft'] = 'Il ne vous reste que {$a}.';
$string['warningstudent'] = 'Le quiz n\'est pas correctement configuré. Veuillez contacter l\'administrateur.';
$string['yes'] = 'Oui';
