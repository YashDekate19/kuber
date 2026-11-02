import logging
from flask import Flask, jsonify
from flask_cors import CORS
from app.config import Config
from app.extensions import init_supabase
from app.middleware.error_handler import register_error_handlers
from app.routes.auth_routes import auth_bp
from app.routes.passenger_routes import passenger_bp
from app.routes.driver_routes import driver_bp
from app.routes.ride_routes import ride_bp
from app.routes.location_routes import location_bp

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger(__name__)

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Enable CORS for frontend
    CORS(app, resources={r"/api/*": {"origins": config_class.CORS_ORIGINS}}, supports_credentials=True)

    # Initialize extensions
    init_supabase()

    # Register error handlers
    register_error_handlers(app)

    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(passenger_bp)
    app.register_blueprint(driver_bp)
    app.register_blueprint(ride_bp)
    app.register_blueprint(location_bp)

    @app.route("/", methods=["GET"])
    def root():
        return jsonify({
            "service": "Kuber Ride-Booking API",
            "version": "1.0.0",
            "status": "operational",
            "docs": "/api/health"
        })

    @app.route("/api/health", methods=["GET"])
    def health_check():
        return jsonify({
            "status": "healthy",
            "service": "Kuber API",
            "environment": config_class.FLASK_ENV,
            "demo_simulation": config_class.ENABLE_DEMO_SIMULATION
        })

    return app

