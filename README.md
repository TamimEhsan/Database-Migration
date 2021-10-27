# Migrate Database

### Task

We had already about 230+ english data in our database. But now we needed bangla too along with english. The translation was done in excel. And in the data only some parts needed to be changed. We need to read the english data from old db and change parts that need to be translated after reading from excel file and push to new db. Thus, we needed a script to automate that. 

### Workflow

- Read rows from excel one by one
- Parse different information [Level, Series, Serial ] from the problem link and other missing information[Topic] from database.
- Check if a definite Topic/Series has been inserted before in new db {Using maps to map english ids to bangla ids}. 
  - If not then create a new entry and map that from english id
- Fetch the english problem data from db. And replace [title{C},description{D},statement{E},hint{G},explanation{H}]
  - Check if any english description/statement/hint or explanation. If so parse the markdown link and append them to respective bangla data.
  - Check if the solution format is MCQ. If so, Edit the submission data in data > data >..... too
- Push the newly formed data to db.
- Continue

### Challenges:

- The translators didn't include the image links during translating. Thus we needed to identify images from english data and append them with bangla data.
- Some part of the data were not translated for some reasons. Didn't realize that at first and it caused the pool transaction to drop for some few times.
- And also some excel rows were empty! Just why man 😒 You had only one job and you crashed it!

### Stuff it has:

- Reading excel file
- Regex link parsing
- Query Transactions etc

### Conclusion

This script is only kind of a note to self. So don't bother if it looks weird to you!  
