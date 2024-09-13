# Stash
A minimal implementation of a personal storage service.

[Section](https://www.theodinproject.com/lessons/nodejs-file-uploader)

## Features
### Users
- User accounts can be created and logged into
- User account usernames and passwords can be edited
- Users can delete their own accounts and content
### Files and Directories
- Users can create directories and navigate among them, similarly to a file explorer
- Directory names and locations can be edited
- Directories can be given a "share until" date that allows anyone, even those not logged in, to view, navigate, and download them and their file contents
- Users can upload individual files (**TODO** within an enforced, relatively small size limit) into directories
- File names and locations can be edited
- Files of types `text` and `image` are previewed on the page when viewing them
- Directories can be downloaded as .zip files, files can be downloaded individually
- **TODO** Search page to allow searching using file and directory names, given locations, or shared status

## Technologies
- Written in **Typescript**, to enhance dev experience with type safety and IntelliSense
- **PostgreSQL** as the database client, with Prisma ORM to streamline data manipulation with more intuitive queries and quicker editions to the database structure
- **Express.js** as the server framework, due to its age and maturity, lending to ease of research whenever a problem occurs
- **PassportJS** to handle user authentication
- **Supabase** as cloud storage for uploaded files 

## Concerns of Improvement
- Accessibility - does the interface provide an acceptable accessibility experience?
- Vulnerability - are some forms, routes, previews prone to attacks?

### Miscellaneous TODOs
- Add repo link to header
- Change Supabase file names to include user IDs too
- Different directory table layout if there is nothing in user's root filesystem
- See if `read` and `read-shared` files can be combined?
- What other kinds of file types can be previewed?
