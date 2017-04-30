const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

const should = chai.should();

const {BlogPost} = require('../models');
const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHttp);

function tearDownDb() {
  return new Promise((resolve, reject) => {
    console.warn('Deleting database');
    mongoose.connection.dropDatabase()
      .then(result => resolve(result))
      .catch(err => reject(err))
  });
}

function seedBlogData(){
	const seedData = [];

	for(let i=1; i<=10; i++){
		seedData.push({
		author: {
			firstName: faker.name.firstName(),
			lastName: faker.name.lastName()
		},
		title: faker.lorem.sentence(),
		content: faker.lorem.text()
		});
	}
	return BlogPost.insertMany(seedData);
}

function generateBlogPostData(){
	return { 
		author: 
			{firstName: faker.name.firstName(),
				lastName: faker.name.lastName()},
		content: faker.lorem.paragraph(),
		title: faker.lorem.sentence(),
		date: faker.date.past()
			}
}


describe('Blogposts API Resource', function (){

	before(function(){
		return runServer(TEST_DATABASE_URL);
	});

	beforeEach(function(){
		return seedBlogData();
	});

	afterEach(function(){
		return tearDownDb();
	});

	after(function(){
		return closeServer;
	});

	describe('GET endpoint', function(){

		it('should retrieve all blogposts', function(){
			let res;
			return chai.request(app)
			.get('/posts')
			.then(function(_res){
				res = _res;
				res.should.have.status(200);
				res.body.entries.should.have.length.of.at.least(1);
				return BlogPost.count()
			})
			.then(function(count){
				res.body.entries.should.have.length.of(count);
			})
		})

		it('should make sure object has correct fields', function(){
			let resblogpost;
			return chai.request(app)
			.get('/posts')
			.then(function(res){
				res.should.have.status(200);
				res.should.be.json;
				res.body.entries.should.be.a('array');
				res.body.entries.should.have.length.of.at.least(1);

				res.body.entries.forEach(function(entry){
					entry.should.be.a('object');
					entry.should.include.keys(
						'author', 'created', 'content', 'id', 'title')
				});
				resblogpost = res.body.entries[0];
				return BlogPost.findById(resblogpost.id);
			})
				.then(function(entry){
					resblogpost.id.should.equal(entry.id);
					resblogpost.author.should.equal(entry.author);
					resblogpost.content.should.equal(entry.content);
					resblogpost.created.should.equal(entry.created);
					resblogpost.title.should.equal(entry.title);
				});

		});
	});

	describe('POST endpoints', function(){

		it('should add blog entry', function(){
			const newEntry = generateBlogPostData();

			return chai.request(app)
			.post('/posts')
			.send(newEntry)
			.then(function(res){
				res.should.have.status(201);
				res.should.be.json;
				res.body.should.be.a('object');
				res.body.should.include.keys(
					'author', 'content', 'created', 'id', 'title');
				res.body.id.should.not.be.null;
				res.body.author.should.equal(newEntry.author);
				res.body.title.should.equal(newEntry.title);
				return BlogPost.findById(newEntry.id)
			})
			.then(function(entry){
				entry.author.should.equal(newEntry.author);
				entry.content.should.equal(newEntry.content);
				entry.created.should.equal(newEntry.created);
				entry.id.should.equal(newEntry.id);
			});
		});
	});

	describe('PUT endpoints', function(){
		it('should update blog entry', function(){
			const updateData = {
				author: 'Mark Twain',
				title: 'The Adventures of Huckleberry Finn'
			};

			return BlogPost
			.findOne()
			.exec()
			.then(function(entry){
				updateData.id = entry.id;

				return chai.request(app)
				.put(`/posts/${posts.id}`)
				.send(updateData)
			})
			.then(function(res){
				res.should.have.status(201);
				return BlogPost.findById(updateData.id).exec();
			})
			.then(function(entry){
				entry.author.should.equal(updateData.author);
				entry.title.should.equal(updateData.title);
			});
		});
	})

	describe('DELETE endpoints', function(){
		it('should delete blog entry', function (){
			let blogpost;
			return BlogPost
			.findOne()
			.exec()
			.then(function(_blogpost){
				blogpost = _blogpost;

				return chai.request(app)
				.delete(`/posts/${posts.id}`);
			})
			.then(function(res){
				res.should.have.status(204);
				return BlogPost.findById(blogpost.id).exec();
			})
			.then(function(_blogpost){
				should.not.exist(_blogpost);
			});
		});
	});
});

