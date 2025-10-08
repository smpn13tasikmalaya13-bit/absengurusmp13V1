import { db } from '../firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { MOCK_CLASSES, MOCK_ESKULS, MOCK_LESSON_SCHEDULE, MOCK_EXTRA_SCHEDULE } from './dataService';

export const seedDatabase = async (): Promise<void> => {
  console.log('Starting database seed...');

  // Create a new batch
  const batch = writeBatch(db);

  // Seed Classes
  const classesCol = collection(db, 'classes');
  MOCK_CLASSES.forEach(classData => {
    const docRef = doc(classesCol); // Automatically generate a new ID
    batch.set(docRef, classData);
  });
  console.log(`${MOCK_CLASSES.length} classes added to batch.`);

  // Seed Eskuls
  const eskulsCol = collection(db, 'eskuls');
  MOCK_ESKULS.forEach(eskulData => {
    const docRef = doc(eskulsCol);
    batch.set(docRef, eskulData);
  });
  console.log(`${MOCK_ESKULS.length} eskuls added to batch.`);

  // Seed Lesson Schedules
  const lessonSchedulesCol = collection(db, 'schedules');
  MOCK_LESSON_SCHEDULE.forEach(scheduleData => {
    const docRef = doc(lessonSchedulesCol);
    batch.set(docRef, scheduleData);
  });
  console.log(`${MOCK_LESSON_SCHEDULE.length} lesson schedules added to batch.`);

  // Seed Eskul Schedules
  const eskulSchedulesCol = collection(db, 'eskulSchedules');
  MOCK_EXTRA_SCHEDULE.forEach(scheduleData => {
    const docRef = doc(eskulSchedulesCol);
    batch.set(docRef, scheduleData);
  });
  console.log(`${MOCK_EXTRA_SCHEDULE.length} eskul schedules added to batch.`);


  try {
    // Commit the batch
    await batch.commit();
    console.log('Database seeded successfully!');
    alert('Database has been successfully seeded with initial data!');
  } catch (error) {
    console.error('Error seeding database:', error);
    alert(`An error occurred while seeding the database. Check the console for details.`);
    throw new Error('Database seeding failed.');
  }
};