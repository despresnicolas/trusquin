package main

import (
	"embed"
	"log"

	"github.com/wailsapp/wails/v3/pkg/application"
)

// Front SvelteKit compilé en statique (adapter-static) par `pnpm build`.
//
//go:embed all:dist
var assets embed.FS

func main() {
	dbPath, err := defaultDBPath()
	if err != nil {
		log.Fatal(err)
	}
	history, err := openHistory(dbPath)
	if err != nil {
		log.Fatal(err)
	}

	app := application.New(application.Options{
		Name:        "SAURON",
		Description: "Générateur et analyse de configuration Claude Code",
		Services: []application.Service{
			application.NewService(&RepoService{}),
			application.NewService(history),
		},
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
	})

	app.Menu.Set(newMenu(app))

	app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:  "SAURON",
		Width:  1280,
		Height: 820,
		URL:    "/",
	})

	if err := app.Run(); err != nil {
		log.Fatal(err)
	}
}
