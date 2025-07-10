import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabase('medicines.db');

export const init = () => {
  const promise = new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        'CREATE TABLE IF NOT EXISTS medicines (id INTEGER PRIMARY KEY NOT NULL, name TEXT NOT NULL, dosage TEXT NOT NULL, schedule TEXT NOT NULL);',
        [],
        () => {
          console.log('Medicines table created successfully or already exists.');
          resolve();
        },
        (_, err) => {
          console.error('Error creating medicines table:', err);
          reject(err);
        }
      );
    });
  });
  return promise;
};

export const addMedicine = (name, dosage, schedule) => {
  const promise = new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        'INSERT INTO medicines (name, dosage, schedule) VALUES (?, ?, ?);',
        [name, dosage, schedule],
        (_, result) => {
          console.log('Medicine added successfully:', result);
          resolve(result);
        },
        (_, err) => {
          console.error('Error adding medicine:', err);
          reject(err);
        }
      );
    });
  });
  return promise;
};

export const getMedicines = () => {
  const promise = new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        'SELECT * FROM medicines;',
        [],
        (_, result) => {
          const medicines = [];
          for (let i = 0; i < result.rows.length; i++) {
            medicines.push(result.rows.item(i));
          }
          console.log('Medicines retrieved successfully:', medicines);
          resolve(medicines);
        },
        (_, err) => {
          console.error('Error retrieving medicines:', err);
          reject(err);
        }
      );
    });
  });
  return promise;
};
