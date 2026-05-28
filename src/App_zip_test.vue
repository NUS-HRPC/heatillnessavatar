<script setup>
import { ref, onMounted } from 'vue';
import JSZip from 'jszip';

const exerciseData = ref(null);
const progressMessages = ref([]);

// Helper function to add progress messages with a timestamp
function addProgress(message) {
  const timestamp = new Date().toLocaleTimeString();
  progressMessages.value.push({ message, timestamp });
}

async function fetchAndParseZip() {
  try {
    addProgress("Starting fetch of ZIP file");
    const response = await fetch('https://raw.githubusercontent.com/zyf0717/garmin-data-analysis/main/data/training-session-2025-02-11-8052216696.zip', { cache: 'no-cache' });
    addProgress("ZIP file fetched successfully");

    const arrayBuffer = await response.arrayBuffer();
    addProgress("ZIP file read as ArrayBuffer");

    const zip = new JSZip();
    const zipContent = await zip.loadAsync(arrayBuffer);
    addProgress("ZIP file loaded and parsed");

    // Locate the exercise JSON file within the ZIP
    const jsonFile = zipContent.file("training-session-2025-02-11-8052216696.json");
    if (!jsonFile) {
      addProgress("exercise.json not found in ZIP file");
      throw new Error("exercise.json not found in the zip file");
    }
    addProgress("exercise.json found in ZIP file");

    // Read and parse the JSON file
    const jsonText = await jsonFile.async("string");
    addProgress("exercise.json read as string");

    const data = JSON.parse(jsonText);
    addProgress("JSON parsed successfully");

    // Set the reactive variable to display the data
    exerciseData.value = data;
    addProgress("Data loaded successfully");
  } catch (error) {
    console.error('Error fetching and parsing exercise zip file:', error);
    addProgress("Error occurred: " + error.message);
  }
}

onMounted(() => {
  fetchAndParseZip();
});
</script>

<template>
  <v-app>
    <v-container class="px-5">
      <h1>Exercise Data</h1>
      <div v-if="exerciseData">
        <p><strong>Export Version:</strong> {{ exerciseData.exportVersion }}</p>
        <p><strong>Device ID:</strong> {{ exerciseData.deviceId }}</p>
        <p><strong>Start Time:</strong> {{ exerciseData.startTime }}</p>
        <p><strong>Stop Time:</strong> {{ exerciseData.stopTime }}</p>
        <p><strong>Distance:</strong> {{ exerciseData.distance }}</p>
        <p><strong>Duration:</strong> {{ exerciseData.duration }}</p>
        <p><strong>Maximum Heart Rate:</strong> {{ exerciseData.maximumHeartRate }}</p>
        <p><strong>Average Heart Rate:</strong> {{ exerciseData.averageHeartRate }}</p>
        <p><strong>Kilo Calories:</strong> {{ exerciseData.kiloCalories }}</p>
        <h2>Physical Information Snapshot</h2>
        <p><strong>Sex:</strong> {{ exerciseData.physicalInformationSnapshot.sex }}</p>
        <p><strong>Birthday:</strong> {{ exerciseData.physicalInformationSnapshot.birthday }}</p>
        <p>
          <strong>Height (cm):</strong>
          {{ exerciseData.physicalInformationSnapshot["height, cm"] }}
        </p>
        <p>
          <strong>Weight (kg):</strong>
          {{ exerciseData.physicalInformationSnapshot["weight, kg"] }}
        </p>
        <p><strong>VO2 Max:</strong> {{ exerciseData.physicalInformationSnapshot.vo2Max }}</p>
        <p><strong>Resting Heart Rate:</strong> {{ exerciseData.physicalInformationSnapshot.restingHeartRate }}</p>
        <p><strong>Aerobic Threshold:</strong> {{ exerciseData.physicalInformationSnapshot.aerobicThreshold }}</p>
        <p><strong>Anaerobic Threshold:</strong> {{ exerciseData.physicalInformationSnapshot.anaerobicThreshold }}</p>
        <p>
          <strong>Functional Threshold Power:</strong>
          {{ exerciseData.physicalInformationSnapshot.functionalThresholdPower }}
        </p>
      </div>
      <div v-else>
        Loading exercise data...
      </div>

      <h2>Progress Log</h2>
      <ul>
        <li v-for="(log, index) in progressMessages" :key="index">
          <strong>{{ log.timestamp }}:</strong> {{ log.message }}
        </li>
      </ul>
    </v-container>
  </v-app>
</template>