PHONY: run-db run-backend run-frontend run-browser build-docker-backend build-docker-frontend

run-db:
	docker run -d --name webapp-postgres -p 5432:5432 -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=webapp postgres

run-backend:
	cd backend && DATABASE_URL=postgresql://postgres:postgres@localhost:5432/webapp cargo run

run-frontend:
	cd frontend && npm run dev

run-browser:
	/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --disable-web-security --user-data-dir=$$HOME/google-chrome-dir http://localhost:3000

build-docker-backend:
	docker build -f docker/backend.Dockerfile -t webapp-backend:latest .

build-docker-frontend:
	docker build -f docker/frontend.Dockerfile -t webapp-frontend:latest .
