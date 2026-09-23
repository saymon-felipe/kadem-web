// Sugestões opcionais de configuração. Nenhuma regra de negócio depende destes nomes ou opções.
export const DIGESTIVE_WELLBEING_TEMPLATE = [
  { template_key: "wellbeing-energy", name: "Disposição", group: "Bem-estar", value_type: "SCALE", min_value: 0, max_value: 10 },
  { template_key: "digestive-pain", name: "Dor abdominal", group: "Sintomas", value_type: "SCALE", min_value: 0, max_value: 10 },
  { template_key: "digestive-output", name: "Consistência das fezes/efluente", group: "Digestão", value_type: "SINGLE", options: ["Líquida", "Pastosa", "Formada"] },
  { template_key: "digestive-food", name: "Alimentação", group: "Hábitos", value_type: "TAGS" },
  { template_key: "digestive-occurrences", name: "Ocorrências", group: "Sintomas", value_type: "MULTI", options: ["Diarreia", "Cólica", "Náusea", "Fadiga"] },
  { template_key: "wellbeing-sleep", name: "Horas de sono", group: "Hábitos", value_type: "NUMBER", unit: "h" },
  { template_key: "ostomy-skin", name: "Incômodo na pele/estoma", group: "Aspectos físicos", value_type: "SCALE", min_value: 0, max_value: 10 },
];
