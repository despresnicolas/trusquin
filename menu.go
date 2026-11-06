package main

import "github.com/wailsapp/wails/v3/pkg/application"

// navigateEvent demande au front d'ouvrir un onglet (écouté dans src/routes/+layout.svelte).
const navigateEvent = "navigate"

// newMenu construit la barre de menus macOS en français, limitée à ce que l'app sait faire.
func newMenu(app *application.App) *application.Menu {
	menu := app.NewMenu()

	sauron := menu.AddSubmenu("SAURON")
	role(sauron, application.About, "À propos de SAURON")
	sauron.AddSeparator()
	role(sauron, application.Hide, "Masquer SAURON")
	role(sauron, application.HideOthers, "Masquer les autres")
	role(sauron, application.UnHide, "Tout afficher")
	sauron.AddSeparator()
	role(sauron, application.Quit, "Quitter SAURON")

	edit := menu.AddSubmenu("Édition")
	role(edit, application.Undo, "Annuler")
	role(edit, application.Redo, "Rétablir")
	edit.AddSeparator()
	role(edit, application.Cut, "Couper")
	role(edit, application.Copy, "Copier")
	role(edit, application.Paste, "Coller")
	role(edit, application.SelectAll, "Tout sélectionner")

	goTo := menu.AddSubmenu("Aller")
	for i, tab := range []struct{ label, path string }{
		{"Accueil", "/"},
		{"Analyse de dépôt", "/analyze"},
		{"Générateur", "/generator"},
	} {
		goTo.Add(tab.label).SetAccelerator("CmdOrCtrl+" + string(rune('1'+i))).OnClick(func(*application.Context) {
			app.Event.Emit(navigateEvent, tab.path)
		})
	}

	view := menu.AddSubmenu("Présentation")
	role(view, application.ZoomIn, "Agrandir")
	role(view, application.ZoomOut, "Réduire")
	role(view, application.ResetZoom, "Taille réelle")
	view.AddSeparator()
	role(view, application.ToggleFullscreen, "Plein écran")

	window := menu.AddSubmenu("Fenêtre")
	role(window, application.Minimise, "Placer dans le Dock")
	role(window, application.Zoom, "Zoom")
	role(window, application.CloseWindow, "Fermer")
	window.AddSeparator()
	role(window, application.BringAllToFront, "Tout ramener au premier plan")

	help := menu.AddSubmenu("Aide")
	help.Add("Documentation Claude Code").OnClick(func(*application.Context) {
		_ = app.Browser.OpenURL("https://code.claude.com/docs")
	})
	help.Add("Dépôt SAURON sur GitHub").OnClick(func(*application.Context) {
		_ = app.Browser.OpenURL("https://github.com/despresnicolas/sauron")
	})

	return menu
}

// role ajoute un élément natif (raccourci et action système conservés) avec un libellé français.
func role(m *application.Menu, r application.Role, label string) {
	m.AddRole(r).FindByRole(r).SetLabel(label)
}
