from app.schemas.user import UserCreate, UserLogin, UserResponse, UserUpdate, StaffCreate
from app.schemas.address import AddressCreate, AddressUpdate, AddressResponse
from app.schemas.warehouse import WarehouseCreate, WarehouseUpdate, WarehouseResponse
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse
from app.schemas.subcategory import SubCategoryCreate, SubCategoryUpdate, SubCategoryResponse
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse
from app.schemas.cart import CartItemCreate, CartItemUpdate, CartItemResponse
from app.schemas.order import OrderResponse, OrderItemResponse, OrderStatusUpdate, CheckoutRequest, ConfirmPaymentRequest
from app.schemas.auth import Token, TokenData
from app.schemas.dashboard import DashboardStats, RevenueData, TopProduct, CategoryDistribution, OrderTrend
from app.schemas.cancellation_request import CancellationRequestCreate, CancellationRequestResolve, CancellationRequestResponse
from app.schemas.return_request import ReturnRequestItemCreate, ReturnRequestCreate, ReturnRequestResolve, ReturnRequestItemResponse, ReturnRequestResponse
