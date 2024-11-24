import os
import logging
import pandas as pd
from typing import Dict, Optional

class ValidatorGadget:
    def __init__(self):
        self.mapping = self.load_validator_mapping()
        
    def load_validator_mapping(self) -> pd.DataFrame:
        """Loads validator mapping from disk"""
        try:
            logging.info("Loading validator mapping")
            df = pd.read_parquet("validator_mapping.parquet")
            df["validator_id"] = df["validator_id"].astype(int)
            df.set_index("validator_id", inplace=True)
            df["lido_node_operator"] = df["lido_node_operator"].apply(lambda x: x.lower() if isinstance(x, str) else x)
            df["label"] = df["label"].apply(lambda x: x.lower() if isinstance(x, str) else x)
            logging.info(f"Loaded validator mapping with {len(df)} entries")
            return df
        except Exception as e:
            logging.error(f"Failed to load validator mapping: {str(e)}")
            return pd.DataFrame()
        
    def get_validator_entity(self, validator_index: int) -> Optional[Dict]:
        """Get entity info for a validator index"""
        try:
            validator_index = int(validator_index)
            if validator_index not in self.mapping.index:
                return {
                    "label": "unknown",
                    "type": "unknown",
                    "node_operator": "unknown"
                }
                
            row = self.mapping.loc[validator_index]
            node_operator = row.get("lido_node_operator", "unknown")
            label = row.get("label", "unknown")
            type_val = row.get("type", "unknown")

            if node_operator is None:
                node_operator = "unknown"
            if label is None:
                label = "unknown"
            if type_val is None:
                type_val = "unknown"

            return {
                "label": label,
                "type": type_val,
                "node_operator": node_operator
            }
        except Exception as e:
            logging.error(f"Error getting validator entity for index {validator_index}: {str(e)}")
            return {
                "label": "unknown",
                "type": "unknown",
                "node_operator": "unknown"
            } 