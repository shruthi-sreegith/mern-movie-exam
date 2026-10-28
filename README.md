# Movie Watchlist Manager (MERN Stack)

## Project Structure
project-root/
├── frontend/
└── backend/

## API Endpoints
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/movies` | Add new movie |
| `GET` | `/api/movies` | Get movies (with filter, search, pagination) |
| `GET` | `/api/movies/watch-next` | Highest priority watch recommendation |
| `GET` | `/api/movies/stats` | Aggregated dashboard stats |
| `PUT` | `/api/movies/:id` | Edit movie details |
| `PATCH` | `/api/movies/:id/status` | Update status transition and rating |
| `DELETE` | `/api/movies/:id` | Delete movie (rejections applied for 'Watching') |

## How to Run
1. **Backend**:
   ```bash
   cd backend
   npm install
   node server.js