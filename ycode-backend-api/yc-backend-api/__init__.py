from django.db.backends.base.schema import BaseDatabaseSchemaEditor
from django.db.backends.ddl_references import Statement

# Save the original _create_fk_sql method
original_create_fk_sql = BaseDatabaseSchemaEditor._create_fk_sql

def custom_create_fk_sql(self, model, field, suffix):
    # Check if the target model is unmanaged
    target_model = field.target_field.model
    if not target_model._meta.managed:
        # Return a no-op statement instead of trying to create a foreign key constraint
        # to a table that doesn't exist (since it's unmanaged)
        return Statement("SELECT 1")
    return original_create_fk_sql(self, model, field, suffix)

# Apply the patch
BaseDatabaseSchemaEditor._create_fk_sql = custom_create_fk_sql
