import { Router } from 'express';
import { NewsController } from '../controllers/news.controller';

const router = Router();
const newsController = new NewsController();

// GET /api/news
router.get('/', newsController.getRecentNews);

// GET /api/news/search?query=something
router.get('/search', newsController.searchNews);

// GET /api/news/category/stocks
router.get('/category/:category', newsController.getNewsByCategory);

// GET /api/news/123
router.get('/:id', newsController.getArticle);

export default router;
