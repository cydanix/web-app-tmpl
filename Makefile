PHONY: run-db run-backend run-frontend

run-db:
	docker run -d --name webapp-postgres -p 5432:5432 -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=webapp postgres

run-backend:
	cd backend && DATABASE_URL=postgresql://postgres:postgres@localhost:5432/webapp cargo run

run-frontend:
	cd frontend && npm run dev
