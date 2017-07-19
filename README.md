# encampments

A map of San Francisco homelessness data maintained by Saint Francis Homeless Challenge (saintfrancischallenge.org).

## 311 Data
Pulled form the DataSF API.  Note DataSF's data is not particularly clean in early years, so check early data before making assumptions about format.
 
## DPW Data

DPW Data is available via manual data pulls in XLS format. At this time, we do not try to compile these snapshots, (the most recent snapshot *should* be the most recent update on all previous data).

To add a new data file, manually edit the CSV to ensure naming and format consistency (somehow DPW pulls it differently every time?) CSV->JSON the XLS file and manually add to encampments.json.  Someday we will automate this process but not until we can get a cleaner source.  The naming convention for the key for each data file is currently the month and two digit year written out (e.g. february-seventeen). You will also need to add the corresponding section to the select form field.

## ELI Data
We hope to add ELI data (as it is collected) as a third data type on this map.  

## Deploy
For deploy creds, please contact SFHC.
