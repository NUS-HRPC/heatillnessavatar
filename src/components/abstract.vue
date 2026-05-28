<template>
  <v-card elevation="2" style="height: 100%; display: flex; flex-direction: column;">
    <v-card-title class="d-flex align-center">
      <v-icon class="mr-2" color="blue-grey">mdi-text-box-outline</v-icon>
      Abstract
    </v-card-title>
     <v-card-text style="font-size: 16px; font-weight: 400; text-align: left; flex: 1; overflow-y: auto; min-height: 0;">
      <div v-if="row">
        <div class="abstract-text" v-html="formattedAbstract"></div>
      </div>
      <div v-else>
        Select a row from the Data Table to view abstract.
      </div>
    </v-card-text>
  </v-card>
</template>

<script>
import DOMPurify from 'dompurify';
export default {
  name: 'Abstract',
  props: {
  row: {
    type: Object,
    default: null
  }
    },

    data() {
        return {
        formattedAbstract: ''
        };
    },
    watch: {
    row(newVal) {
      this.renderabstract(newVal);
    }},
    methods: {
        async renderabstract(selected_row){

        if (!selected_row) {
          this.formattedAbstract = 'Select a row from the Data Table to view abstract.';
          return;
        }
        const pmid_doi = selected_row['PMID/DOI'] || '';
        const abstract = selected_row.Abstract || '';

        let doilinks = '';
        let pmidlinks = '';

        if (pmid_doi) {
          const parts = pmid_doi.split('DOI: ');
          const pmid = parts[0].replace('PMID: ', '').trim();
          const doi = parts[1] ? parts[1].trim() : 'NIL';
          if (doi && doi !== 'NIL') {
            doilinks = `<a href="https://doi.org/${doi}" target="_blank">${doi}</a><br>`;
          }
          if (pmid && pmid !== 'NIL' && pmid !== 'Nil') {
            pmidlinks = `<a href="https://pubmed.ncbi.nlm.nih.gov/${pmid}" target="_blank">${pmid}</a><br>`;
          }
        }

        const links = (pmidlinks || doilinks) ? `${pmidlinks}<br>${doilinks}<br>` : '';
        this.formattedAbstract = DOMPurify.sanitize(`${links}${abstract}`, { ADD_ATTR: ['target'] });
        }
            }

};
</script>