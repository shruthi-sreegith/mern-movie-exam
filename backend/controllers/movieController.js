const Movie = require('../models/Movie');
const Counter = require('../models/Counter');

const sendRes = (res, status, success, message, data = null) => 
  res.status(status).json({ success, message, data });

exports.addMovie = async (req, res) => {
  try {
    const { title, genre, releaseYear, runtime, platform, priority } = req.body;
    const currentYear = new Date().getFullYear();

    if (releaseYear < 1950 || releaseYear > currentYear) 
      return sendRes(res, 400, false, `Release year must be between 1950 and ${currentYear}`);
    if (runtime < 30 || runtime > 300) 
      return sendRes(res, 400, false, 'Runtime must be between 30 and 300 minutes');

    const existing = await Movie.findOne({
      title: { $regex: new RegExp(`^${title.trim()}$`, 'i') },
      releaseYear
    });
    if (existing) return sendRes(res, 409, false, 'A movie with this Title and Release Year already exists.');

    const counter = await Counter.findOneAndUpdate(
      { year: releaseYear },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    const sequenceStr = String(counter.seq).padStart(3, '0');
    const movieCode = `MV-${releaseYear}-${sequenceStr}`;

    const newMovie = new Movie({ movieCode, title: title.trim(), genre, releaseYear, runtime, platform, priority });
    await newMovie.save();
    return sendRes(res, 201, true, 'Movie added successfully', newMovie);
  } catch (err) {
    if (err.code === 11000) return sendRes(res, 409, false, 'A movie with this Title and Release Year already exists.');
    return sendRes(res, 500, false, err.message);
  }
};

exports.getMovies = async (req, res) => {
  try {
    const { status, genre, search, page = 1, limit = 6 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (genre) query.genre = genre;
    if (search) query.title = { $regex: search, $options: 'i' };

    const skip = (Number(page) - 1) * Number(limit);
    const sort = status === 'To Watch' ? { priority: -1, createdAt: -1 } : { createdAt: -1 };

    const movies = await Movie.find(query).sort(sort).skip(skip).limit(Number(limit));
    const total = await Movie.countDocuments(query);

    return sendRes(res, 200, true, 'Fetched movies', { movies, totalPages: Math.ceil(total / limit) || 1 });
  } catch (err) {
    return sendRes(res, 500, false, err.message);
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { newStatus, rating } = req.body;
    const movie = await Movie.findById(req.params.id);
    if (!movie) return sendRes(res, 404, false, 'Movie not found');

    const transitions = { 'To Watch': ['Watching', 'Watched'], 'Watching': ['Watched', 'To Watch'], 'Watched': [] };
    if (!transitions[movie.status].includes(newStatus)) {
      return sendRes(res, 400, false, `Invalid transition from ${movie.status} to ${newStatus}`);
    }

    if (newStatus === 'Watched') {
      if (!rating || rating < 1 || rating > 10) {
        return sendRes(res, 400, false, 'Mandatory rating (1-10) required when marking as Watched.');
      }
      movie.rating = rating;
      movie.watchedDate = new Date();
    }

    movie.status = newStatus;
    await movie.save();
    return sendRes(res, 200, true, 'Status updated', movie);
  } catch (err) {
    return sendRes(res, 500, false, err.message);
  }
};

exports.getWatchNext = async (req, res) => {
  try {
    const nextMovie = await Movie.findOne({ status: 'To Watch' }).sort({ priority: -1, runtime: 1 });
    if (!nextMovie) return sendRes(res, 404, false, 'No movies found in "To Watch" status.');
    return sendRes(res, 200, true, 'Watch next fetched', nextMovie);
  } catch (err) {
    return sendRes(res, 500, false, err.message);
  }
};

exports.getStats = async (req, res) => {
  try {
    const statusAgg = await Movie.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
    const counts = { 'To Watch': 0, 'Watching': 0, 'Watched': 0 };
    statusAgg.forEach(item => { counts[item._id] = item.count; });

    const watchedAgg = await Movie.aggregate([
      { $match: { status: 'Watched' } },
      { $group: { _id: null, totalRuntime: { $sum: '$runtime' }, avgRating: { $avg: '$rating' } } }
    ]);

    const topGenreAgg = await Movie.aggregate([
      { $match: { status: 'Watched' } },
      { $group: { _id: '$genre', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 }
    ]);

    return sendRes(res, 200, true, 'Stats fetched', {
      statusCounts: counts,
      totalHoursWatched: watchedAgg.length ? Number((watchedAgg[0].totalRuntime / 60).toFixed(1)) : 0,
      avgRating: watchedAgg.length ? Number(watchedAgg[0].avgRating.toFixed(1)) : 0,
      topGenre: topGenreAgg.length ? topGenreAgg[0]._id : 'N/A'
    });
  } catch (err) {
    return sendRes(res, 500, false, err.message);
  }
};

exports.editMovie = async (req, res) => {
  try {
    const { title, genre, runtime, platform, priority } = req.body;
    const movie = await Movie.findById(req.params.id);
    if (!movie) return sendRes(res, 404, false, 'Movie not found');

    movie.title = title.trim();
    movie.genre = genre;
    movie.runtime = runtime;
    movie.platform = platform;
    movie.priority = priority;

    await movie.save();
    return sendRes(res, 200, true, 'Movie updated', movie);
  } catch (err) {
    return sendRes(res, 500, false, err.message);
  }
};

exports.deleteMovie = async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return sendRes(res, 404, false, 'Movie not found');
    if (movie.status === 'Watching') return sendRes(res, 400, false, 'Cannot delete a movie while in Watching status.');

    await Movie.findByIdAndDelete(req.params.id);
    return sendRes(res, 200, true, 'Movie deleted successfully');
  } catch (err) {
    return sendRes(res, 500, false, err.message);
  }
};