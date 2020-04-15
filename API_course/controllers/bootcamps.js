const ErrorResponse = require('../utilities/errorResponse');
const asyncHandler = require('../middleware/async');
const geocoder = require('../utilities/geocoder');
const Bootcamp = require('../models/Bootcamp')

//@desc       get all bootCamps
//@route      GET/api/v1/bootcamps
//@access     public
exports.getbootCamps = asyncHandler(async (req, res, next) => {
    let query;

    // copy req.query
    const reqQuery = { ...req.query };

    //fields to exclude
    const removeFields = ['select', 'sort', 'limit', 'page'];

    // loop over and removeFields and delete them from reqQuery
    removeFields.forEach(param => delete reqQuery[param]);


    let queryStr = JSON.stringify(reqQuery);

    //create operators {$gt|gte,etc..}
    queryStr = queryStr.replace(/\b(gt|gte|lte|lt|in)\b/g, match => `$${match}`);

    //find resource
    query = Bootcamp.find(JSON.parse(queryStr)).populate('courses');

    //select fields
    if (req.query.select) {
        const fields = req.query.select.split(',').join(' ');
        query = query.select(fields);
    }
    // Sort
    if (req.query.sort) {
        const sortBy = req.query.sort.split(',').join(' ');
        query = query.sort(sortBy);
    } else {
        query = query.sort('-createdAt');
    }
    //Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit, 10) || 1;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Bootcamp.countDocuments();
    query = query.skip(startIndex).limit(limit);


    //Excuting  Query
    const bootcamp = await query;

    // Pagination result
    const pagination = {};
    if (endIndex < total) {
        pagination.next = {
            page: page + 1,
            limit
        }
    }
    if (startIndex > 0) {
        pagination.prev = {
            page: page - 1,
            limit
        }
    }

    res.status(200).json({ sucess: true, count: bootcamp.length, pagination: pagination, data: bootcamp })
})

// @desc      Get single bootcamp
// @route     GET /api/v1/bootcamps/:id
// @access    Public
exports.getbootCamp = asyncHandler(async (req, res, next) => {

    const bootcamp = await Bootcamp.findById(req.params.id)
    if (!bootcamp) {
        return next(new ErrorResponse(`Bootcamp not found with id of ${req.params.id} `, 404));
    }
    res.status(200).json({ success: true, data: bootcamp })
})

// @desc      Create new bootcamp
// @route     POST /api/v1/bootcamps
// @access    Private
exports.createbootCamp = asyncHandler(async (req, res, next) => {

    const bootcamp = await Bootcamp.create(req.body)
    res.status(201).json({
        success: true,
        data: bootcamp
    });
    res.status(400).json({ success: false, msg: `bad request` })
})

// @desc      Update bootcamp
// @route     PUT /api/v1/bootcamps/:id
// @access    Private
exports.updatebootCamp = asyncHandler(async (req, res, next) => {

    const bootcamp = await Bootcamp.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });
    if (!bootcamp) {
        res.status(400).json({ success: false, msg: `not found` });
    }
    req.status(200).json({ success: true, data: bootcamp });

})

// @desc      Delete bootcamp
// @route     DELETE /api/v1/bootcamps/:id
// @access    Private
exports.deletebootCamp = asyncHandler(async (req, res, next) => {

    const bootcamp = await Bootcamp.findById(req.params.id);

    if (!bootcamp) {
        res.status(400).json({ success: false, msg: `bad request` });
    }
    bootcamp.remove();
    res.status(200).json({ success: true, data: {} });
});

// @desc      GET bootcamps within a radius
// @route     GET /api/v1/bootcamps/radius/:zipcode/:distance
// @access    Private
exports.getBootcampsInRadius = asyncHandler(async (req, res, next) => {

    const { zipcode, distance } = req.params;

    // Get lat/lng from geocoder
    const loc = await geocoder.geocode(zipcode);
    const lng = loc[0].longitude;  //x
    const lat = loc[0].latitude;   //y


    // Calc radius using radians
    // Divide dist by radius of Earth
    // Earth Radius = 3,963 mi / 6,378 km
    const radius = distance / 3963;

    const bootcamps = await Bootcamp.find({
        location: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }
    });

    res.status(200).json({
        success: true,
        count: bootcamps.length,
        data: bootcamps
    });
});
