package main

import (
	"runtime"

	"github.com/wailsapp/wails/v3/pkg/application"
)

// navigateEvent demande au front d'ouvrir un onglet (écouté dans src/routes/+layout.svelte).
const navigateEvent = "navigate"

// settingsEvent ouvre le panneau des réglages (écouté dans src/lib/components/Settings.svelte).
const settingsEvent = "settings"

// newMenu construit la barre de menus en français, limitée à ce que l'app sait faire,
// selon les usages de chaque système : menu d'application sur macOS, Fichier/Aide ailleurs.
func newMenu(app *application.App) *application.Menu {
	menu := app.NewMenu()

	mac := runtime.GOOS == "darwin"

	if mac {
		sauron := menu.AddSubmenu("SAURON")
		role(sauron, application.About, "À propos de SAURON")
		sauron.AddSeparator()
		sauron.Add("Réglages…").SetAccelerator("CmdOrCtrl+,").OnClick(func(*application.Context) {
			app.Event.Emit(settingsEvent)
		})
		sauron.AddSeparator()
		role(sauron, application.ServicesMenu, "Services")
		sauron.AddSeparator()
		role(sauron, application.Hide, "Masquer SAURON")
		role(sauron, application.HideOthers, "Masquer les autres")
		role(sauron, application.UnHide, "Tout afficher")
		sauron.AddSeparator()
		role(sauron, application.Quit, "Quitter SAURON")
	} else {
		file := menu.AddSubmenu("Fichier")
		role(file, application.Quit, "Quitter")
	}

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

	viewLabel := "Affichage"
	if mac {
		viewLabel = "Présentation"
	}
	view := menu.AddSubmenu(viewLabel)
	role(view, application.ZoomIn, "Agrandir")
	role(view, application.ZoomOut, "Réduire")
	role(view, application.ResetZoom, "Taille réelle")
	view.AddSeparator()
	role(view, application.ToggleFullscreen, "Plein écran")

	// Windows et Linux gèrent la fenêtre depuis sa barre de titre.
	if mac {
		window := menu.AddSubmenu("Fenêtre")
		role(window, application.Minimise, "Placer dans le Dock")
		role(window, application.Zoom, "Zoom")
		role(window, application.CloseWindow, "Fermer")
		window.AddSeparator()
		role(window, application.BringAllToFront, "Tout ramener au premier plan")
	}

	help := menu.AddSubmenu("Aide")
	help.Add("Documentation Claude Code").OnClick(func(*application.Context) {
		_ = app.Browser.OpenURL("https://code.claude.com/docs")
	})
	help.Add("Dépôt SAURON sur GitHub").OnClick(func(*application.Context) {
		_ = app.Browser.OpenURL("https://github.com/despresnicolas/sauron")
	})
	if !mac {
		help.AddSeparator()
		role(help, application.About, "À propos de SAURON")
	}

	return menu
}

// role ajoute un élément natif (raccourci et action système conservés) avec un libellé français.
func role(m *application.Menu, r application.Role, label string) {
	m.AddRole(r).FindByRole(r).SetLabel(label)
}
