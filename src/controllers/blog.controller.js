const httpStatus = require('http-status');
const pick = require('../utils/pick');
const catchAsync = require('../utils/catchAsync');
const { blogService } = require('../services');

const getBlogs = catchAsync(async (req, res) => {
  const filter = { userEmail: req.user.email };
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await blogService.queryBlogs(filter, options);
  res.send(result);
});

const getBlog = catchAsync(async (req, res) => {
  const blog = await blogService.checkBlogExistsOrNot(req.params.blogId, req.user.email);
  res.send(blog);
});

const createBlog = catchAsync(async (req, res) => {
  const user = await blogService.createBlog(req.user._id, req.user.email, req.body);
  res.status(httpStatus.CREATED).send(user);
});

const updateBlog = catchAsync(async (req, res) => {
  const blog = await blogService.checkBlogExistsOrNot(req.params.blogId, req.user.email);
  const updatedBlog = await blogService.updateBlog(blog, req.body);
  res.status(httpStatus.OK).send(updatedBlog);
});

const deleteBlog = catchAsync(async (req, res) => {
  await blogService.deleteBlogById(req.params.blogId, req.user.email);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  getBlogs,
  createBlog,
  getBlog,
  updateBlog,
  deleteBlog,
};
